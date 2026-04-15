
Current finding:
- The proxy is up. Your `node server.js` output shows:
  - `POR1 proxy (SERVICE LAYER) running on http://0.0.0.0:3001`
  - `Service Layer session established ...`
- The TLS warning is expected in this setup because the proxy intentionally allows the SAP self-signed certificate.
- From the code I inspected, the new fields are already wired in:
  - table columns: `Unit Price` and `Total LC`
  - mass-update panel: `Delivery Date`, `Unit Price`, `Total LC`
- The frontend is hardcoded to call `http://10.1.0.88:3001` (`src/lib/por1Api.ts`), and the exact error message you saw is shown whenever the fetch to the proxy fails (`src/pages/Index.tsx`).

Plan to resolve this:
1. Restore both runtime services
   - Make sure the frontend web server on port `8082` is running as well as the proxy on `3001`.
   - Right now the strongest clue is your earlier answer that the frontend status was “Not sure”. The proxy alone is not enough.

2. Verify the failing hop
   - Check whether the app page itself is reachable at `http://10.1.0.88:8082`.
   - Then check whether the browser can reach the proxy endpoints from the same internal machine:
     - `/api/health`
     - `/api/por1/open-rows`
   - This will tell us whether the issue is:
     - frontend not running,
     - proxy not reachable from the browser,
     - or data fetch failing behind the proxy.

3. If you want me to harden the app after approval, I would implement:
   - configurable API base URL instead of hardcoded `10.1.0.88:3001`
   - a visible health indicator in the UI for:
     - app loaded
     - proxy reachable
     - data query successful
   - clearer error text showing which endpoint failed

4. Deployment cleanup I’d make after approval
   - unify startup/deploy flow so the frontend and proxy are started consistently
   - reduce the current “multiple PowerShell windows” confusion with one documented process

Technical details:
- Files inspected:
  - `src/lib/por1Api.ts`
  - `src/pages/Index.tsx`
  - `src/components/POR1Table.tsx`
  - `src/components/UpdatePanel.tsx`
  - `src/types/por1.ts`
- Likely conclusion:
  - this does not look like a missing-feature/code regression
  - it looks like a runtime/deployment connectivity issue between the browser, port `8082`, and port `3001`
