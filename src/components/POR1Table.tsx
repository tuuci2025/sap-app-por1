import { POR1Row } from "@/types/por1";
import { Checkbox } from "@/components/ui/checkbox";

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
            <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">PO #</th>
            <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Vendor</th>
            <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Item Code</th>
            <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Description</th>
            <th className="px-3 py-2.5 text-right font-semibold text-xs uppercase tracking-wider">Open Qty</th>
            <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Ship Date</th>
            <th className="px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Whs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
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
