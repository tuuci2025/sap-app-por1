import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronRight, Database } from "lucide-react";
import { generateSelectSQL } from "@/lib/por1Api";

const SQLReference = () => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const selectSQL = generateSelectSQL();

  const proxyCode = `// ── Node.js Express Backend Proxy (server.js) ──
// Install: npm install express mssql cors
// Run: node server.js

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  server: 'YOUR_SAP_B1_SQL_SERVER',   // e.g. 'sap-server\\\\B1'
  database: 'YOUR_SAP_B1_DATABASE',    // e.g. 'SBODemoUS'
  user: 'sa',                           // or a read/write SQL user
  password: 'YOUR_PASSWORD',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// GET open POR1 rows
app.get('/api/por1/open-rows', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(\`
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
    \`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update ShipDate
app.post('/api/por1/update-shipdate', async (req, res) => {
  const { rows, newDate } = req.body;
  try {
    const pool = await sql.connect(dbConfig);
    const pairs = rows
      .map(r => \`(\${r.DocEntry}, \${r.LineNum})\`)
      .join(', ');
    const query = \`
      UPDATE POR1
      SET ShipDate = @newDate
      WHERE (DocEntry, LineNum) IN (\${pairs})
      AND LineStatus = 'O'
    \`;
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

app.listen(3001, () => {
  console.log('POR1 proxy running on http://localhost:3001');
});`;

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
      >
        <Database className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">SQL Reference & Backend Proxy Code</span>
        {expanded ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* SELECT query */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                SELECT — Fetch open POR1 rows
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(selectSQL, "select")}
                className="h-7 text-xs gap-1"
              >
                {copied === "select" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === "select" ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="bg-table-header text-table-header-foreground p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {selectSQL}
            </pre>
          </div>

          {/* Node.js proxy */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Node.js Backend Proxy — server.js
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(proxyCode, "proxy")}
                className="h-7 text-xs gap-1"
              >
                {copied === "proxy" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === "proxy" ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="bg-table-header text-table-header-foreground p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
              {proxyCode}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 border-l-2 border-primary pl-3">
            <p><strong>To wire real data:</strong></p>
            <p>1. Save the Node.js proxy code above as <code className="font-mono bg-muted px-1 rounded">server.js</code> on your SAP B1 server</p>
            <p>2. Run <code className="font-mono bg-muted px-1 rounded">npm install express mssql cors</code> then <code className="font-mono bg-muted px-1 rounded">node server.js</code></p>
            <p>3. In <code className="font-mono bg-muted px-1 rounded">src/lib/por1Api.ts</code>, change <code className="font-mono bg-muted px-1 rounded">mode: 'mock'</code> to <code className="font-mono bg-muted px-1 rounded">mode: 'proxy'</code></p>
            <p>4. Set <code className="font-mono bg-muted px-1 rounded">baseUrl</code> to your server address, e.g. <code className="font-mono bg-muted px-1 rounded">http://sap-server:3001</code></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SQLReference;
