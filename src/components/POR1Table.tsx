import { useState, useRef, useCallback } from "react";
import { POR1Row } from "@/types/por1";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type SortKey = "DocNum" | "CardName" | "ItemCode" | "Dscription" | "OpenQty" | "Price" | "LineTotal" | "ShipDate" | "WhsCode" | "BlockNum" | "NumAtCard";
type SortDir = "asc" | "desc";

interface POR1TableProps {
  rows: POR1Row[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}

function rowKey(r: POR1Row) {
  return `${r.DocEntry}-${r.LineNum}`;
}

function getDateClass(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  const diffDays = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "text-danger font-semibold";
  if (diffDays <= 7) return "text-warning font-semibold";
  return "text-success";
}

const DEFAULT_WIDTHS: Record<string, number> = {
  checkbox: 34,
  DocNum: 62,
  CardName: 130,
  ItemCode: 110,
  Dscription: 140,
  OpenQty: 62,
  Price: 78,
  LineTotal: 88,
  ShipDate: 88,
  WhsCode: 42,
  BlockNum: 82,
  NumAtCard: 88,
};

const POR1Table = ({ rows, selectedKeys, onToggle, onToggleAll, allSelected }: POR1TableProps) => {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const onMouseDown = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidthsRef.current[col];

    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX;
      const newW = Math.max(40, startW + diff);
      setColWidths(prev => ({ ...prev, [col]: newW }));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="inline ml-1 h-3 w-3" />
      : <ArrowDown className="inline ml-1 h-3 w-3" />;
  };

  const thClass = "relative px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 transition-colors";

  const ResizeHandle = ({ col }: { col: string }) => (
    <div
      onMouseDown={(e) => onMouseDown(col, e)}
      className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 group"
      style={{ touchAction: "none" }}
    >
      <div className="absolute right-0 top-0 h-full w-0.5 bg-transparent group-hover:bg-accent/60 group-active:bg-accent transition-colors" />
    </div>
  );

  const tableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: colWidths.checkbox }} />
          <col style={{ width: colWidths.DocNum }} />
          <col style={{ width: colWidths.NumAtCard }} />
          <col style={{ width: colWidths.ShipDate }} />
          <col style={{ width: colWidths.CardName }} />
          <col style={{ width: colWidths.ItemCode }} />
          <col style={{ width: colWidths.Dscription }} />
          <col style={{ width: colWidths.OpenQty }} />
          <col style={{ width: colWidths.Price }} />
          <col style={{ width: colWidths.LineTotal }} />
          <col style={{ width: colWidths.WhsCode }} />
          <col style={{ width: colWidths.BlockNum }} />
        </colgroup>
        <thead>
          <tr className="bg-table-header text-table-header-foreground sticky top-0 z-10">
            <th className="px-3 py-2.5 text-center" style={{ width: colWidths.checkbox }}>
              <Checkbox
                checked={allSelected && rows.length > 0}
                onCheckedChange={onToggleAll}
                className="border-table-header-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </th>
            <th className={thClass} onClick={() => handleSort("DocNum")}>
              PO #<SortIcon col="DocNum" /><ResizeHandle col="DocNum" />
            </th>
            <th className={thClass} onClick={() => handleSort("NumAtCard")}>
              Referentie<SortIcon col="NumAtCard" /><ResizeHandle col="NumAtCard" />
            </th>
            <th className={thClass} onClick={() => handleSort("ShipDate")}>
              Delivery Date<SortIcon col="ShipDate" /><ResizeHandle col="ShipDate" />
            </th>
            <th className={thClass} onClick={() => handleSort("CardName")}>
              Vendor<SortIcon col="CardName" /><ResizeHandle col="CardName" />
            </th>
            <th className={thClass} onClick={() => handleSort("ItemCode")}>
              Item Code<SortIcon col="ItemCode" /><ResizeHandle col="ItemCode" />
            </th>
            <th className={thClass} onClick={() => handleSort("Dscription")}>
              Description<SortIcon col="Dscription" /><ResizeHandle col="Dscription" />
            </th>
            <th className={`${thClass} text-right`} onClick={() => handleSort("OpenQty")}>
              Open Qty<SortIcon col="OpenQty" /><ResizeHandle col="OpenQty" />
            </th>
            <th className={`${thClass} text-right`} onClick={() => handleSort("Price")}>
              Unit Price<SortIcon col="Price" /><ResizeHandle col="Price" />
            </th>
            <th className={`${thClass} text-right`} onClick={() => handleSort("LineTotal")}>
              Total LC<SortIcon col="LineTotal" /><ResizeHandle col="LineTotal" />
            </th>
            <th className={thClass} onClick={() => handleSort("WhsCode")}>
              Whs<SortIcon col="WhsCode" /><ResizeHandle col="WhsCode" />
            </th>
            <th className={thClass} onClick={() => handleSort("BlockNum")}>
              Sales Order<SortIcon col="BlockNum" /><ResizeHandle col="BlockNum" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => {
            const key = rowKey(row);
            const isSelected = selectedKeys.has(key);
            return (
              <tr
                key={key}
                onClick={() => onToggle(key)}
                className={`cursor-pointer border-b border-border transition-colors ${
                  isSelected
                    ? "bg-table-selected"
                    : i % 2 === 0
                    ? "bg-card"
                    : "bg-table-stripe"
                } hover:bg-table-hover`}
              >
                <td className="px-3 py-2 text-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(key)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-3 py-2 font-mono font-medium truncate">{row.DocNum}</td>
                <td className="px-3 py-2 font-mono text-xs truncate" title={row.NumAtCard}>{row.NumAtCard}</td>
                <td className="px-3 py-2 truncate" title={row.CardName}>{row.CardName}</td>
                <td className="px-3 py-2 font-mono text-xs truncate">{row.ItemCode}</td>
                <td className="px-3 py-2 truncate" title={row.Dscription}>{row.Dscription}</td>
                <td className="px-3 py-2 text-right font-mono">{row.OpenQty.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">{row.Price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right font-mono">{row.LineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`px-3 py-2 font-mono text-xs ${getDateClass(row.ShipDate)}`}>{row.ShipDate}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.WhsCode}</td>
                <td className="px-3 py-2 font-mono text-xs truncate" title={row.BlockNum}>{row.BlockNum}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={12} className="px-3 py-12 text-center text-muted-foreground">
                No open POR1 rows found matching your filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default POR1Table;
