import { useState, useEffect, useMemo } from "react";
import { POR1Row } from "@/types/por1";
import { fetchOpenPOR1Rows, executeShipDateUpdate } from "@/lib/por1Api";
import { addChangeLogEntry } from "@/lib/changeLog";
import FilterBar from "@/components/FilterBar";
import POR1Table from "@/components/POR1Table";
import UpdatePanel from "@/components/UpdatePanel";
import ChangeLogPanel from "@/components/ChangeLogPanel";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function rowKey(r: POR1Row) {
  return `${r.DocEntry}-${r.LineNum}`;
}

const Index = () => {
  const [rows, setRows] = useState<POR1Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchOpenPOR1Rows();
      setRows(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load POR1 data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        String(r.DocNum).includes(term) ||
        r.ItemCode.toLowerCase().includes(term) ||
        r.Dscription.toLowerCase().includes(term) ||
        r.CardName.toLowerCase().includes(term) ||
        r.CardCode.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedKeys.has(rowKey(r)));

  const handleToggle = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredRows.map(rowKey)));
    }
  };

  const selectedRows = rows
    .filter((r) => selectedKeys.has(rowKey(r)))
    .map((r) => ({ DocEntry: r.DocEntry, LineNum: r.LineNum }));

  const handleUpdate = async (newDate: string, updatedBy: string) => {
    // Capture old dates before update
    const affectedRows = rows
      .filter((r) => selectedKeys.has(rowKey(r)))
      .map((r) => ({ DocEntry: r.DocEntry, LineNum: r.LineNum, oldDate: r.ShipDate.split("T")[0] }));

    try {
      const result = await executeShipDateUpdate(selectedRows, newDate, updatedBy);
      if (result.success) {
        // Log the change
        addChangeLogEntry({
          timestamp: new Date().toISOString(),
          updatedBy,
          newDate,
          rowCount: affectedRows.length,
          rows: affectedRows,
        });

        // Update local state
        setRows((prev) =>
          prev.map((r) =>
            selectedKeys.has(rowKey(r)) ? { ...r, ShipDate: newDate } : r
          )
        );
        setSelectedKeys(new Set());
        toast({
          title: "ShipDate Updated",
          description: `${selectedRows.length} row(s) updated to ${newDate}`,
        });
      } else {
        toast({ title: "Update Failed", description: "The database did not confirm the update.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: `Update failed: ${err instanceof Error ? err.message : "Unknown error"}`, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase">
              <span className="text-accent">TUUCI</span>
              <span className="mx-2 opacity-30">|</span>
              POR1 ShipDate Updater
            </h1>
            <p className="text-xs opacity-50 mt-0.5">Batch update ship dates across open purchase order lines</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono opacity-40 hidden sm:inline uppercase tracking-wider">
            Live
          </span>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <Button
            size="sm"
            variant="ghost"
            onClick={loadData}
            disabled={loading}
            className="text-primary-foreground hover:bg-accent/20"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {/* Filters */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalRows={rows.length}
        filteredRows={filteredRows.length}
      />

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading POR1 data...
        </div>
      ) : (
        <POR1Table
          rows={filteredRows}
          selectedKeys={selectedKeys}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          allSelected={allSelected}
        />
      )}

      {/* Update Panel */}
      <UpdatePanel
        selectedCount={selectedKeys.size}
        selectedRows={selectedRows}
        onUpdate={handleUpdate}
        onClear={() => setSelectedKeys(new Set())}
      />

      {/* Change Log */}
      <ChangeLogPanel />
    </div>
  );
};

export default Index;