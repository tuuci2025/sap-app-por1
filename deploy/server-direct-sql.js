// ══════════════════════════════════════════════════════════════
// POR1 Proxy — DIRECT SQL MODE (Original / Backup)
// ══════════════════════════════════════════════════════════════
// This version uses direct MSSQL queries for both reads and writes.
// ShipDate updates go straight to POR1 via UPDATE statements.
// ⚠️  SAP audit trail (ADO1/ADOC) is NOT generated with this approach.
//
// Location: C:\Users\jborremans\Desktop\POR1\server-direct-sql.js
// To revert: copy this file to server.js and restart the proxy.
// ──────────────────────────────────────────────────────────────

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  server: 'YOUR_SAP_B1_SQL_SERVER',   // e.g. 'sap-server\\B1'
  database: 'YOUR_SAP_B1_DATABASE',    // e.g. 'SBODemoUS'
  user: 'sa',
  password: 'YOUR_PASSWORD',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// GET open POR1 rows (direct SQL — same in both modes)
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

// POST update ShipDate (DIRECT SQL — no ADO1 entries)
app.post('/api/por1/update-shipdate', async (req, res) => {
  const { rows, newDate } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const pairs = rows
      .map(r => `(${r.DocEntry}, ${r.LineNum})`)
      .join(', ');
    const query = `
      UPDATE POR1
      SET ShipDate = @newDate
      WHERE (DocEntry, LineNum) IN (${pairs})
      AND LineStatus = 'O'
    `;
    const result = await pool.request()
      .input('newDate', sql.Date, newDate)
      .query(query);
    res.json({
      success: true,
      affectedRows: result.rowsAffected[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, '0.0.0.0', () => {
  console.log('POR1 proxy (DIRECT SQL) running on http://0.0.0.0:3001');
});
