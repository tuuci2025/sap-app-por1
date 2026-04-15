import { POR1Row, ApiConfig } from "@/types/por1";
import { MOCK_ROWS } from "@/data/mockPor1Data";

const config: ApiConfig = {
  mode: 'proxy',
  baseUrl: 'http://10.1.0.88:3001',
};

export async function fetchOpenPOR1Rows(): Promise<POR1Row[]> {
  if (config.mode === 'mock') {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_ROWS), 300));
  }

  // Real MSSQL proxy mode
  const response = await fetch(`${config.baseUrl}/api/por1/open-rows`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
  return response.json();
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

  const response = await fetch(`${config.baseUrl}/api/por1/update-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, field, value, updatedBy }),
  });
  if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);
  return response.json();
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
