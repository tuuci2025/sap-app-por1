import { useState, useEffect, useMemo } from "react";
import { POR1Row } from "@/types/por1";
import { fetchOpenPOR1Rows } from "@/lib/por1Api";
import FilterBar from "@/components/FilterBar";
import POR1Table from "@/components/POR1Table";
import UpdatePanel from "@/components/UpdatePanel";
import SQLReference from "@/components/SQLReference";
import { Database, RefreshCw } from "lucide-react";
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

  const handleUpdate = (newDate: string) => {
    // In mock mode, update locally
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
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-table-header text-table-header-foreground border-b border-border">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5" />
          <div>
            <h1 className="text-base font-bold tracking-tight">POR1 ShipDate Updater</h1>
            <p className="text-xs opacity-70">Batch update ship dates across open purchase order lines</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono opacity-60 hidden sm:inline">
            MODE: MOCK DATA
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadData}
            disabled={loading}
            className="text-table-header-foreground hover:bg-primary/20"
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

      {/* SQL Reference */}
      <SQLReference />
    </div>
  );
};

export default Index;
