import { POR1Row, ApiConfig, SapUser } from "@/types/por1";
import { MOCK_ROWS } from "@/data/mockPor1Data";

const FALLBACK_PROXY_URL = 'http://10.1.0.88:3001';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveProxyBaseUrl() {
  const envUrl = import.meta.env.VITE_POR1_PROXY_URL?.trim();
  if (envUrl) return normalizeBaseUrl(envUrl);

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:3001`;
  }

  return FALLBACK_PROXY_URL;
}

const config: ApiConfig = {
  mode: 'proxy',
  baseUrl: resolveProxyBaseUrl(),
};

export interface ProxyHealthResponse {
  status: string;
  mode: string;
  slSession?: string;
}

export function getProxyBaseUrl(): string {
  return config.baseUrl;
}

export function getProxyEndpoint(path: string): string {
  return `${config.baseUrl}${path}`;
}

async function extractErrorDetails(response: Response): Promise<string> {
  const responseText = await response.text();

  if (!responseText) return '';

  try {
    const parsed = JSON.parse(responseText) as { error?: string; message?: string };
    return parsed.error || parsed.message || responseText;
  } catch {
    return responseText;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = getProxyEndpoint(path);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const details = await extractErrorDetails(response);
      const detailSuffix = details ? ` — ${details}` : '';
      throw new Error(`Request to ${url} failed (${response.status} ${response.statusText})${detailSuffix}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === 'TypeError') {
      throw new Error(`Could not reach ${url}. Make sure the internal proxy server is running and reachable from this browser.`);
    }

    throw error;
  }
}

export async function fetchOpenPOR1Rows(): Promise<POR1Row[]> {
  if (config.mode === 'mock') {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_ROWS), 300));
  }

  return requestJson<POR1Row[]>('/api/por1/open-rows');
}

export async function checkProxyHealth(): Promise<ProxyHealthResponse> {
  if (config.mode === 'mock') {
    return { status: 'ok', mode: 'mock', slSession: 'mock' };
  }

  return requestJson<ProxyHealthResponse>('/api/health');
}

export async function executeFieldUpdate(
  rows: { DocEntry: number; LineNum: number }[],
  field: 'ShipDate' | 'Price' | 'LineTotal',
  value: string,
  updatedBy: string
): Promise<{ success: boolean; affectedRows?: number }> {
  if (config.mode === 'mock') {
    return { success: true, affectedRows: rows.length };
  }

  return requestJson<{ success: boolean; affectedRows?: number }>('/api/por1/update-field', {
    method: 'POST',
    body: JSON.stringify({ rows, field, value, updatedBy }),
  });
}

export function generateSelectSQL(): string {
  return `SELECT
    T0.DocEntry,
    T0.LineNum,
    T1.DocNum,
    T1.CardCode,
    T1.CardName,
    T0.ItemCode,
    T0.Dscription,
    T0.ShipDate,
    T0.OpenQty,
    T0.Price,
    T0.LineTotal,
    T0.WhsCode
FROM POR1 T0
INNER JOIN OPOR T1 ON T1.DocEntry = T0.DocEntry
WHERE T1.DocStatus = 'O'
  AND T0.LineStatus = 'O'
  AND T0.OpenQty > 0
ORDER BY T1.DocNum, T0.LineNum;`;
}

export function generateUpdateSQL(
  rows: { DocEntry: number; LineNum: number }[],
  field: 'ShipDate' | 'Price' | 'LineTotal',
  value: string
): string {
  if (rows.length === 0) return "-- No rows selected";
  const pairs = rows.map(r => `(${r.DocEntry}, ${r.LineNum})`).join(",\n    ");
  const sqlValue = field === 'ShipDate' ? `'${value}'` : value;
  const columnName = field === 'LineTotal' ? 'LineTotal' : field;
  return `-- Update ${columnName} for ${rows.length} selected POR1 row(s)
-- Run a SELECT first to verify:
-- SELECT DocEntry, LineNum, ItemCode, ${columnName} FROM POR1
-- WHERE (DocEntry, LineNum) IN (${pairs.replace(/\n\s*/g, " ")})

UPDATE POR1
SET ${columnName} = ${sqlValue}
WHERE (DocEntry, LineNum) IN (
    ${pairs}
)
AND LineStatus = 'O';`;
}
