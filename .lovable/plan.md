

## Problem

SAP B1's change log groups your updates into an **existing instance** instead of creating a new one. This is because the Service Layer reuses the same session (`B1SESSION`) across multiple PATCHes. SAP treats all changes within a single session as part of the same "editing session," so they get appended to the last open instance rather than spawning a fresh one.

## Solution

Force a **fresh Service Layer login before each PATCH operation**. This creates a new SAP session for every document update, which SAP treats as a distinct "user opened the document and saved" action — generating a new instance in the change log.

## Changes

**`deploy/server.js`** — Modify the update-shipdate handler:

1. Before each PATCH, call `slLogin()` to get a fresh session ID (instead of reusing the cached one)
2. This ensures each document update is seen by SAP as a separate editing session

The key change is adding `await slLogin()` inside the `for` loop, right before the GET + PATCH for each DocEntry. This forces a new `B1SESSION` cookie per document, which should trigger a new change log instance.

## After Approval

You'll need to:
1. Stop the proxy on your production server (`Stop-Process -Name node -Force`)
2. Copy the updated `server.js` to `C:\Users\jborremans\Desktop\POR1\`
3. Start it again: `node server.js`
4. The frontend doesn't change, so no frontend redeployment needed

