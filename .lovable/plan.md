## Goal
Include the Delivery Date (ESD / Due Date) in the search filter so typing a date like `2026-05` or `2026-05-19` narrows the table.

## Change
Single edit in `src/pages/Index.tsx`, inside the `filteredRows` memo — add one more OR clause to the predicate:

```ts
(r.ShipDate && r.ShipDate.toLowerCase().includes(term))
```

Dates are stored as ISO strings (`2026-05-19T00:00:00.000Z`), so substring matching on `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` will work naturally.

## Out of scope
No table, type, proxy, or SQL changes — purely a frontend filter tweak.
