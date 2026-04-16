// ══════════════════════════════════════════════════════════════
// POR1 Proxy — SERVICE LAYER MODE
// ══════════════════════════════════════════════════════════════
// Reads:   Direct MSSQL (fast, read-only)
// Writes:  SAP Service Layer PATCH (creates ADO1/ADOC audit trail)
//
// Location: C:\Users\jborremans\Desktop\POR1\server.js
// Install:  npm install express mssql cors node-fetch@2
// Run:      node server.js
// ──────────────────────────────────────────────────────────────

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// ── Configuration ────────────────────────────────────────────
const dbConfig = {
  server: 'nltuupro01',
  database: 'TUUCI_PRODUCTIE',
  user: 'sa',
  password: 'Amista@8614',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const SL_CONFIG = {
  baseUrl: 'https://nltuupro01:50000/b1s/v1',
  companyDb: 'TUUCI_PRODUCTIE',
  username: 'manager',
  password: '523jx',
};

// ── Service Layer Session Management ─────────────────────────
function storeServiceLayerCookies(res, targetCookies) {
  const rawCookies = res.headers?.raw?.()['set-cookie'] || [];

  for (const cookie of rawCookies) {
    const [nameValue] = cookie.split(';');
    const separatorIndex = nameValue.indexOf('=');
    if (separatorIndex === -1) continue;

    const name = nameValue.slice(0, separatorIndex).trim();
    const value = nameValue.slice(separatorIndex + 1).trim();
    if (!name) continue;

    targetCookies[name] = value;
  }
}

function getServiceLayerCookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function createServiceLayerSession() {
  let sessionId = null;
  let currentUser = null;
  let cookies = {};

  async function login(username, password) {
    const user = username || SL_CONFIG.username;
    const pass = password || SL_CONFIG.password;

    cookies = {};
    sessionId = null;
    currentUser = null;

    const res = await fetch(`${SL_CONFIG.baseUrl}/Login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CompanyDB: SL_CONFIG.companyDb,
        UserName: user,
        Password: pass,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Service Layer login failed for user '${user}' (${res.status}): ${text}`);
    }

    storeServiceLayerCookies(res, cookies);
    const data = await res.json();
    sessionId = data.SessionId;
    cookies.B1SESSION = data.SessionId;
    currentUser = user;
    console.log(`Service Layer session established for '${user}':`, sessionId);
    return sessionId;
  }

  async function request(path, options = {}, credentials = {}) {
    if (!sessionId) await login(credentials.username, credentials.password);

    const url = `${SL_CONFIG.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      Cookie: getServiceLayerCookieHeader(cookies),
      ...options.headers,
    };

    let res = await fetch(url, { ...options, headers });
    storeServiceLayerCookies(res, cookies);

    if (res.status === 401) {
      console.log('Session expired, re-authenticating...');
      await login(credentials.username, credentials.password);
      headers.Cookie = getServiceLayerCookieHeader(cookies);
      res = await fetch(url, { ...options, headers });
      storeServiceLayerCookies(res, cookies);
    }

    return res;
  }

  function status() {
    return { sessionId, currentUser };
  }

  return {
    login,
    fetch: request,
    status,
  };
}

const sharedServiceLayerSession = createServiceLayerSession();

function normalizeLineNumbers(lineNums) {
  return Array.from(
    new Set(
      lineNums
        .map((lineNum) => Number(lineNum))
        .filter((lineNum) => Number.isInteger(lineNum))
    )
  );
}

function getComparableFieldValues(line, field) {
  if (field === 'ShipDate') {
    return [String(line?.ShipDate || '').split('T')[0]];
  }

  if (field === 'UnitPrice') {
    return [line?.UnitPrice, line?.Price];
  }

  return [line?.[field]];
}

function valuesMatch(field, line, expectedValue) {
  if (field === 'ShipDate') {
    const expectedDate = String(expectedValue || '').split('T')[0];
    return getComparableFieldValues(line, field).some((actualValue) => actualValue === expectedDate);
  }

  const expectedNumber = Number(expectedValue);
  if (!Number.isFinite(expectedNumber)) return false;

  return getComparableFieldValues(line, field).some((actualValue) => {
    const actualNumber = Number(actualValue);
    return Number.isFinite(actualNumber)
      && Math.abs(actualNumber - expectedNumber) < 0.000001;
  });
}

function buildLineFieldPatch(field, value) {
  if (field === 'UnitPrice') {
    return {
      UnitPrice: value,
      Price: value,
    };
  }

  return { [field]: value };
}

function buildDocumentLinesPatch(documentLines, targetLineNums, field, value, includeUntouchedLines) {
  const targetSet = new Set(normalizeLineNumbers(targetLineNums));

  return documentLines
    .filter((line) => includeUntouchedLines || targetSet.has(Number(line.LineNum)))
    .map((line) => {
      if (targetSet.has(Number(line.LineNum))) {
        return { LineNum: line.LineNum, ...buildLineFieldPatch(field, value) };
      }
      return { LineNum: line.LineNum };
    });
}

function updatedLinesVerified(documentLines, targetLineNums, field, value) {
  const targetSet = new Set(normalizeLineNumbers(targetLineNums));
  const targetLines = documentLines.filter((line) => targetSet.has(Number(line.LineNum)));

  return targetLines.length === targetSet.size
    && targetLines.every((line) => valuesMatch(field, line, value));
}

async function verifyUpdatedLines(session, docEntry, lineNums, field, value, credentials) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const verifiedDocument = await getPurchaseOrder(session, docEntry, credentials);
    if (updatedLinesVerified(verifiedDocument.DocumentLines, lineNums, field, value)) {
      return;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw new Error(`Verification failed after patch for DocEntry ${docEntry}`);
}

async function getPurchaseOrder(session, docEntry, credentials) {
  const response = await session.fetch(`/PurchaseOrders(${docEntry})`, {}, credentials);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GET failed (${response.status}): ${errorText}`);
  }

  const document = await response.json();
  if (!Array.isArray(document.DocumentLines)) {
    throw new Error('Purchase order payload did not include DocumentLines');
  }

  return document;
}

async function patchPurchaseOrder(session, docEntry, patchBody, credentials) {
  const response = await session.fetch(`/PurchaseOrders(${docEntry})`, {
    method: 'PATCH',
    body: JSON.stringify(patchBody),
  }, credentials);

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`PATCH failed (${response.status}): ${errorText}`);
  }
}

async function updatePurchaseOrderField(docEntry, lineNums, slField, slValue, credentials) {
  const normalizedLineNums = normalizeLineNumbers(lineNums);
  if (normalizedLineNums.length === 0) {
    throw new Error('No valid line numbers supplied for update');
  }

  const strategies = [
    { name: 'full-document-lines', includeUntouchedLines: true },
    { name: 'target-lines-only', includeUntouchedLines: false },
  ];

  let lastError = null;

  for (const strategy of strategies) {
    try {
      const session = createServiceLayerSession();
      await session.login(credentials.username, credentials.password);

      const document = await getPurchaseOrder(session, docEntry, credentials);
      const patchBody = {
        DocumentLines: buildDocumentLinesPatch(
          document.DocumentLines,
          normalizedLineNums,
          slField,
          slValue,
          strategy.includeUntouchedLines
        ),
      };

      console.log(`→ PATCH DocEntry ${docEntry} (${strategy.name}):`, JSON.stringify(patchBody));

      await patchPurchaseOrder(session, docEntry, patchBody, credentials);
      await verifyUpdatedLines(session, docEntry, normalizedLineNums, slField, slValue, credentials);

      return { strategy: strategy.name };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Retrying DocEntry ${docEntry} after ${strategy.name} failed: ${message}`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// ── Routes ───────────────────────────────────────────────────

// GET open POR1 rows (direct SQL — fast read)
app.get('/api/por1/open-rows', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT
        T0.DocEntry, T0.LineNum, T1.DocNum,
        T1.CardCode, T1.CardName,
        T0.ItemCode, T0.Dscription,
        T0.ShipDate, T0.OpenQty,
        T0.Price, T0.LineTotal, T0.WhsCode,
        ISNULL(CAST(T0.BlockNum AS NVARCHAR), '') AS BlockNum,
        ISNULL(T1.NumAtCard, '') AS NumAtCard
      FROM POR1 T0
      INNER JOIN OPOR T1 ON T1.DocEntry = T0.DocEntry
      WHERE T1.DocStatus = 'O'
        AND T0.LineStatus = 'O'
        AND T0.OpenQty > 0
      ORDER BY T1.DocNum, T0.LineNum
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update a field (ShipDate, Price, LineTotal) via SAP Service Layer
app.post('/api/por1/update-field', async (req, res) => {
  const { rows, field, value, updatedBy, sapPassword } = req.body;

  let sapUserCode = updatedBy;
  const codeMatch = updatedBy && updatedBy.match(/\(([^)]+)\)\s*$/);
  if (codeMatch) sapUserCode = codeMatch[1];

  const slFieldMap = {
    ShipDate: 'ShipDate',
    Price: 'UnitPrice',
    LineTotal: 'LineTotal',
  };

  const slField = slFieldMap[field];
  if (!slField) {
    return res.status(400).json({ error: `Unknown field: ${field}` });
  }

  const slValue = field === 'ShipDate' ? value : parseFloat(value);

  try {
    const byDocEntry = {};
    for (const row of rows) {
      if (!byDocEntry[row.DocEntry]) byDocEntry[row.DocEntry] = [];
      byDocEntry[row.DocEntry].push(row.LineNum);
    }

    const slUser = sapPassword ? sapUserCode : undefined;
    const slPass = sapPassword || undefined;
    const credentials = { username: slUser, password: slPass };

    const results = [];
    const errors = [];

    for (const [docEntry, lineNums] of Object.entries(byDocEntry)) {
      try {
        const normalizedDocLineNums = normalizeLineNumbers(lineNums);
        const { strategy } = await updatePurchaseOrderField(docEntry, lineNums, slField, slValue, credentials);

        results.push({
          docEntry: Number(docEntry),
          lineNums: normalizedDocLineNums,
          linesUpdated: normalizedDocLineNums.length,
          status: 'success',
          strategy,
        });
        console.log(`✓ DocEntry ${docEntry}: updated ${lineNums.length} line(s) ${field}=${value} via ${strategy}`);
      } catch (docErr) {
        const message = docErr instanceof Error ? docErr.message : String(docErr);
        errors.push({ docEntry, error: message });
        console.error(`✗ DocEntry ${docEntry}: ${message}`);
      }
    }

    const totalUpdated = results.reduce((sum, result) => sum + result.linesUpdated, 0);

    res.json({
      success: errors.length === 0,
      affectedRows: totalUpdated,
      details: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Update error:', message);
    res.status(500).json({ error: message });
  }
});

// GET active SAP users from OUSR
app.get('/api/sap-users', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT USER_CODE, U_NAME
      FROM OUSR
      WHERE LOCKED = 'N'
      ORDER BY U_NAME
    `);
    const users = result.recordset.map(r => ({
      code: r.USER_CODE,
      name: r.U_NAME || r.USER_CODE,
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Keep old endpoint for backward compat
app.post('/api/por1/update-shipdate', async (req, res) => {
  const { rows, newDate, updatedBy } = req.body;
  req.body = { rows, field: 'ShipDate', value: newDate, updatedBy };
  return res.redirect(307, '/api/por1/update-field');
});

// Health check
app.get('/api/health', (req, res) => {
  const sharedStatus = sharedServiceLayerSession.status();
  res.json({
    status: 'ok',
    mode: 'service-layer',
    slSession: sharedStatus.sessionId ? 'active' : 'none',
  });
});

// ── Start ────────────────────────────────────────────────────

// Allow self-signed certs for Service Layer
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.listen(3001, '0.0.0.0', () => {
  console.log('POR1 proxy (SERVICE LAYER) running on http://0.0.0.0:3001');
  console.log('Reads:  Direct MSSQL');
  console.log('Writes: SAP Service Layer → ADO1/ADOC audit trail');
  // Pre-authenticate with Service Layer (as manager for health/read operations)
  sharedServiceLayerSession.login().catch(err => console.warn('Initial SL login failed (will retry on first request):', err.message));
});
