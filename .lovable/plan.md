

## Plan: Configure server.js with real SAP credentials

Since both authentication methods work, I'll update `deploy/server.js` with the confirmed credentials.

### Changes to `deploy/server.js`

**dbConfig (lines 22-31):**
- `server`: `'nltuupro01'` (the SQL Server hostname)
- `database`: `'TUUCI_PRODUCTIE'`
- `user`: `'sa'` (keep as-is, or update if you use a different SQL user)
- `password`: Your SQL Server `sa` password (you'll need to provide this)

**SL_CONFIG (lines 33-38):**
- `baseUrl`: `'https://nltuupro01:50000/b1s/v1'`
- `companyDb`: `'TUUCI_PRODUCTIE'`
- `username`: `'manager'`
- `password`: `'523jx'`

### Important note
The `-UseBasicParsing` version worked **without** Windows credentials, which means the Service Layer doesn't require HTTP Basic Auth from the server itself — only the browser was prompting. This simplifies things: no extra auth headers needed in `node-fetch`.

### Before I proceed
I need your **SQL Server `sa` password** (for the MSSQL direct-read connection in `dbConfig`). Is it the same as the SAP password (`523jx`), or different? Also confirm the SQL Server hostname — is it `nltuupro01` or `10.1.0.88`?

