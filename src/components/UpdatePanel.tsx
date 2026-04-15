import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, DollarSign, Copy, Check, X } from "lucide-react";
import { generateUpdateSQL } from "@/lib/por1Api";

type UpdateField = "ShipDate" | "Price" | "LineTotal";

interface UpdatePanelProps {
  selectedCount: number;
  selectedRows: { DocEntry: number; LineNum: number }[];
  onUpdate: (field: UpdateField, value: string, updatedBy: string) => void;
  onClear: () => void;
}

const UpdatePanel = ({ selectedCount, selectedRows, onUpdate, onClear }: UpdatePanelProps) => {
  const [activeField, setActiveField] = useState<UpdateField>("ShipDate");
  const [newDate, setNewDate] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLineTotal, setNewLineTotal] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [showSQL, setShowSQL] = useState(false);
  const [copied, setCopied] = useState(false);

  if (selectedCount === 0) return null;

  const currentValue = activeField === "ShipDate" ? newDate : activeField === "Price" ? newPrice : newLineTotal;
  const sql = currentValue ? generateUpdateSQL(selectedRows, activeField, currentValue) : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fieldLabel = activeField === "ShipDate" ? "Delivery Date" : activeField === "Price" ? "Unit Price" : "Total LC";

  return (
    <div className="border-t border-border bg-card px-4 py-3 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {activeField === "ShipDate" ? (
            <CalendarDays className="h-4 w-4 text-primary" />
          ) : (
            <DollarSign className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium">
            {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
          </span>
        </div>

        {/* Field selector tabs */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["ShipDate", "Price", "LineTotal"] as UpdateField[]).map((f) => (
            <button
              key={f}
              onClick={() => { setActiveField(f); setShowSQL(false); }}
              className={`px-3 py-1.5 transition-colors ${
                activeField === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {f === "ShipDate" ? "Delivery Date" : f === "Price" ? "Unit Price" : "Total LC"}
            </button>
          ))}
        </div>

        <Input
          type="text"
          placeholder="Your name"
          value={updatedBy}
          onChange={(e) => setUpdatedBy(e.target.value)}
          className="w-36 h-9 text-sm"
        />

        {activeField === "ShipDate" ? (
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-44 h-9 text-sm font-mono"
          />
        ) : (
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder={activeField === "Price" ? "New unit price" : "New total"}
            value={activeField === "Price" ? newPrice : newLineTotal}
            onChange={(e) => activeField === "Price" ? setNewPrice(e.target.value) : setNewLineTotal(e.target.value)}
            className="w-44 h-9 text-sm font-mono"
          />
        )}

        <Button
          size="sm"
          disabled={!currentValue || !updatedBy.trim()}
          onClick={() => setShowSQL(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Update {fieldLabel}
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
              onUpdate(activeField, currentValue, updatedBy);
              setShowSQL(false);
              if (activeField === "ShipDate") setNewDate("");
              else if (activeField === "Price") setNewPrice("");
              else setNewLineTotal("");
              setUpdatedBy("");
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
