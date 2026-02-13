import { useState } from "react";
import { POR1Row } from "@/types/por1";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type SortKey = "DocNum" | "CardName" | "ItemCode" | "Dscription" | "OpenQty" | "ShipDate" | "WhsCode";
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

const POR1Table = ({ rows, selectedKeys, onToggle, onToggleAll, allSelected }: POR1TableProps) => {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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

  const thClass = "px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:bg-muted/30 transition-colors";

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-table-header text-table-header-foreground sticky top-0 z-10">
            <th className="px-3 py-2.5 w-10 text-center">
              <Checkbox
                checked={allSelected && rows.length > 0}
                onCheckedChange={onToggleAll}
                className="border-table-header-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </th>
            <th className={thClass} onClick={() => handleSort("DocNum")}>PO #<SortIcon col="DocNum" /></th>
            <th className={thClass} onClick={() => handleSort("CardName")}>Vendor<SortIcon col="CardName" /></th>
            <th className={thClass} onClick={() => handleSort("ItemCode")}>Item Code<SortIcon col="ItemCode" /></th>
            <th className={thClass} onClick={() => handleSort("Dscription")}>Description<SortIcon col="Dscription" /></th>
            <th className={`${thClass} text-right`} onClick={() => handleSort("OpenQty")}>Open Qty<SortIcon col="OpenQty" /></th>
            <th className={thClass} onClick={() => handleSort("ShipDate")}>Ship Date<SortIcon col="ShipDate" /></th>
            <th className={thClass} onClick={() => handleSort("WhsCode")}>Whs<SortIcon col="WhsCode" /></th>
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
                <td className="px-3 py-2 font-mono font-medium">{row.DocNum}</td>
                <td className="px-3 py-2 truncate max-w-[200px]" title={row.CardName}>{row.CardName}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.ItemCode}</td>
                <td className="px-3 py-2 truncate max-w-[220px]" title={row.Dscription}>{row.Dscription}</td>
                <td className="px-3 py-2 text-right font-mono">{row.OpenQty.toLocaleString()}</td>
                <td className={`px-3 py-2 font-mono text-xs ${getDateClass(row.ShipDate)}`}>{row.ShipDate}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.WhsCode}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
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
