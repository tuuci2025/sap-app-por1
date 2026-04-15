

## Understanding the constraint

SAP Service Layer records whichever username was used to create the session (currently always `manager`). To make SAP's own history (ADO1/ADOC) show a different user, the proxy would need to log in **as that user**, which requires their password. Since users should not enter SAP passwords in the app, the SAP-internal audit trail will continue to show `manager`.

However, we can still make the **app's own Change Log** (and the free-text field) show the correct SAP user by replacing the manual "Your name" text box with a dropdown populated from SAP's user table.

## What changes

1. **New proxy endpoint: `GET /api/sap-users`**
   - Query MSSQL table `OUSR` for active SAP users (`SELECT USER_CODE, U_NAME FROM OUSR WHERE LOCKED = 'N'`)
   - Return `[{ code: "jborremans", name: "Jan Borremans" }, ...]`

2. **New frontend API function: `fetchSapUsers()`**
   - Calls the new endpoint via the existing `requestJson` helper

3. **Replace free-text "Your name" with a dropdown**
   - In `UpdatePanel.tsx`, swap the `<Input>` for a `<Select>` populated on mount
   - Display format: `Name (USER_CODE)` so users can identify themselves
   - Store the selected user code as `updatedBy`

4. **Load users on app start**
   - Fetch the user list in `Index.tsx` alongside the POR1 data
   - Pass it down to `UpdatePanel`

## SAP audit trail note

If in the future you want SAP history itself to show the real user, we would need to store each SAP user's Service Layer password securely and log in as them per update. That's a separate, larger change. For now, the app's changelog will correctly attribute changes to the selected SAP user.

## Files modified

| File | Change |
|------|--------|
| `deploy/server.js` | Add `GET /api/sap-users` route querying OUSR |
| `src/lib/por1Api.ts` | Add `fetchSapUsers()` function |
| `src/types/por1.ts` | Add `SapUser` interface |
| `src/components/UpdatePanel.tsx` | Replace text input with user dropdown |
| `src/pages/Index.tsx` | Fetch SAP users on load, pass to UpdatePanel |

