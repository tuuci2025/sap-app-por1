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
let slSessionId = null;

async function slLogin() {
  const res = await fetch(`${SL_CONFIG.baseUrl}/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyDB: SL_CONFIG.companyDb,
      UserName: SL_CONFIG.username,
      Password: SL_CONFIG.password,
    }),
    // Service Layer uses self-signed certs in most installations
    ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? {} : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Service Layer login failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  slSessionId = data.SessionId;
  console.log('Service Layer session established:', slSessionId);
  return slSessionId;
}

async function slFetch(path, options = {}) {
  if (!slSessionId) await slLogin();

  const url = `${SL_CONFIG.baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `B1SESSION=${slSessionId}`,
    ...options.headers,
  };

  let res = await fetch(url, { ...options, headers });

  // Session expired — re-login and retry once
  if (res.status === 401) {
    console.log('Session expired, re-authenticating...');
    await slLogin();
    headers.Cookie = `B1SESSION=${slSessionId}`;
    res = await fetch(url, { ...options, headers });
  }

  return res;
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
        T0.Price, T0.LineTotal, T0.WhsCode
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
  const { rows, field, value, updatedBy } = req.body;

  // Map frontend field names to SAP Service Layer property names
  const slFieldMap = {
    ShipDate: 'ShipDate',
    Price: 'UnitPrice',
    LineTotal: 'LineTotal',
  };

  const slField = slFieldMap[field];
  if (!slField) {
    return res.status(400).json({ error: `Unknown field: ${field}` });
  }

  // Convert value to appropriate type
  const slValue = field === 'ShipDate' ? value : parseFloat(value);

  try {
    const byDocEntry = {};
    for (const row of rows) {
      if (!byDocEntry[row.DocEntry]) byDocEntry[row.DocEntry] = [];
      byDocEntry[row.DocEntry].push(row.LineNum);
    }

    const results = [];
    const errors = [];

    for (const [docEntry, lineNums] of Object.entries(byDocEntry)) {
      try {
        await slLogin();

        const getRes = await slFetch(`/PurchaseOrders(${docEntry})`);
        if (!getRes.ok) {
          const errText = await getRes.text();
          errors.push({ docEntry, error: `GET failed (${getRes.status}): ${errText}` });
          continue;
        }

        const doc = await getRes.json();

        const documentLines = doc.DocumentLines.map(line => {
          if (lineNums.includes(line.LineNum)) {
            return { LineNum: line.LineNum, [slField]: slValue };
          }
          return { LineNum: line.LineNum };
        });

        const patchBody = { DocumentLines: documentLines };

        const patchRes = await slFetch(`/PurchaseOrders(${docEntry})`, {
          method: 'PATCH',
          body: JSON.stringify(patchBody),
        });

        if (patchRes.ok || patchRes.status === 204) {
          results.push({
            docEntry: Number(docEntry),
            linesUpdated: lineNums.length,
            status: 'success',
          });
          console.log(`✓ DocEntry ${docEntry}: updated ${lineNums.length} line(s) ${field}=${value}`);
        } else {
          const errText = await patchRes.text();
          errors.push({ docEntry, error: `PATCH failed (${patchRes.status}): ${errText}` });
          console.error(`✗ DocEntry ${docEntry}: ${errText}`);
        }
      } catch (docErr) {
        errors.push({ docEntry, error: docErr.message });
        console.error(`✗ DocEntry ${docEntry}: ${docErr.message}`);
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.linesUpdated, 0);

    res.json({
      success: errors.length === 0,
      affectedRows: totalUpdated,
      details: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Update error:', err.message);
    res.status(500).json({ error: err.message });
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
  res.json({
    status: 'ok',
    mode: 'service-layer',
    slSession: slSessionId ? 'active' : 'none',
  });
});

// ── Start ────────────────────────────────────────────────────

// Allow self-signed certs for Service Layer
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.listen(3001, '0.0.0.0', () => {
  console.log('POR1 proxy (SERVICE LAYER) running on http://0.0.0.0:3001');
  console.log('Reads:  Direct MSSQL');
  console.log('Writes: SAP Service Layer → ADO1/ADOC audit trail');
  // Pre-authenticate with Service Layer
  slLogin().catch(err => console.warn('Initial SL login failed (will retry on first request):', err.message));
});
