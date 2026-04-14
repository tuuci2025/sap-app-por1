

# Fix: SAP Change Log Instance Creation

## Problem
The Service Layer PATCH updates the ShipDate correctly and the change appears in SAP's "Show History," but SAP doesn't create a new **instance row** in the change log (ADOC). This is a known SAP B1 behavior when you PATCH with only the modified lines.

## Root Cause
In `deploy/server.js` (lines 144-152), the PATCH payload only includes the lines being changed:

```js
const documentLines = lineNums.map(lineNum => ({
  LineNum: lineNum,
  ShipDate: newDate,
}));
```

SAP B1's Service Layer sometimes needs the **full DocumentLines array** (all existing lines) in the PATCH body to properly trigger a new change log instance. When only partial lines are sent, SAP may update the field but treat it as a "silent" update without generating a distinct ADOC instance.

## Fix
Modify `deploy/server.js` to include **all** document lines in the PATCH payload. Lines being updated get the new `ShipDate`; all other lines are passed through unchanged. The document data is already fetched (line 135) but currently unused — we'll use it:

```js
// Build full DocumentLines — update selected, pass others through
const documentLines = doc.DocumentLines.map(line => {
  if (lineNums.includes(line.LineNum)) {
    return { LineNum: line.LineNum, ShipDate: newDate };
  }
  return { LineNum: line.LineNum };
});

const patchBody = { DocumentLines: documentLines };
```

## Files Changed
- **`deploy/server.js`** — Update the PATCH payload construction (lines 144-152) to include all document lines from the GET response

## Deployment
After approval, you'll need to restart the Node.js proxy on the production server and redeploy the frontend.

