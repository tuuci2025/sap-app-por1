import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Copy, Check, X } from "lucide-react";
import { generateUpdateSQL } from "@/lib/por1Api";

interface UpdatePanelProps {
  selectedCount: number;
  selectedRows: { DocEntry: number; LineNum: number }[];
  onUpdate: (newDate: string) => void;
  onClear: () => void;
}

const UpdatePanel = ({ selectedCount, selectedRows, onUpdate, onClear }: UpdatePanelProps) => {
  const [newDate, setNewDate] = useState("");
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);

  if (selectedCount === 0) return null;

  const sql = newDate ? generateUpdateSQL(selectedRows, newDate) : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
          </span>
        </div>

        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-44 h-9 text-sm font-mono"
        />

        <Button
          size="sm"
          disabled={!newDate}
          onClick={() => setShowSQL(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Update ShipDate
        </Button>

        <Button size="sm" variant="ghost" onClick={onClear} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      </div>

      {showSQL && sql && (
        <div className="mt-3 animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Generated SQL — Copy and run in SSMS
            </span>
            <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-xs gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="bg-table-header text-table-header-foreground p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {sql}
          </pre>
          <Button
            size="sm"
            className="mt-2 bg-success text-success-foreground hover:bg-success/90"
            onClick={() => {
              onUpdate(newDate);
              setShowSQL(false);
              setNewDate("");
            }}
          >
            Confirm & Apply
          </Button>
        </div>
      )}
    </div>
  );
};

export default UpdatePanel;
