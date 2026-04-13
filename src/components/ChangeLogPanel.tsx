import { useState, useEffect } from "react";
import { ShipDateChangeLog } from "@/types/por1";
import { getChangeLog } from "@/lib/changeLog";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

const ChangeLogPanel = () => {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<ShipDateChangeLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const data = await getChangeLog();
    setLog(data);
    setLoading(false);
  };

  useEffect(() => {
    if (expanded) refresh();
  }, [expanded]);

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
      >
        <History className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold">Change Log</span>
        {expanded ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="h-7 text-xs gap-1">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {loading ? "Loading..." : "No changes recorded yet."}
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {log.map((entry) => (
                <div key={entry.id} className="border border-border rounded p-3 bg-background text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground">{entry.updatedBy}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Changed <span className="font-semibold text-accent">{entry.rowCount} row{entry.rowCount > 1 ? "s" : ""}</span> → 
                    <span className="font-mono font-semibold text-foreground ml-1">{entry.newDate}</span>
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      View affected rows
                    </summary>
                    <div className="mt-1 text-xs font-mono space-y-0.5 max-h-32 overflow-y-auto">
                      {entry.rows.map((r: any, i: number) => (
                        <div key={i} className="text-muted-foreground">
                          DocEntry: {r.DocEntry}, LineNum: {r.LineNum}
                          {r.oldDate && <span className="ml-2">(was: {r.oldDate})</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChangeLogPanel;