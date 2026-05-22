import { useState, useEffect, useMemo } from "react";
import { POR1Row, SapUser } from "@/types/por1";
import { checkProxyHealth, executeFieldUpdate, fetchOpenPOR1Rows, fetchSapUsers, getProxyBaseUrl } from "@/lib/por1Api";
import { addChangeLogEntry } from "@/lib/changeLog";
import ConnectionStatus from "@/components/ConnectionStatus";
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

type RuntimeStatus = "idle" | "checking" | "online" | "error";

function getFriendlyError(message: string) {
  if (message.includes('/api/health')) {
    return 'The browser could not reach the proxy health endpoint.';
  }

  if (message.includes('/api/por1/open-rows')) {
    return 'The proxy is reachable, but loading open purchase order rows failed.';
  }

  if (message.includes('/api/por1/update-field')) {
    return 'The update request reached the proxy, but the field update failed.';
  }

  return 'Could not complete the request to the internal proxy server.';
}

const Index = () => {
  const [rows, setRows] = useState<POR1Row[]>([]);
  const [sapUsers, setSapUsers] = useState<SapUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [proxyStatus, setProxyStatus] = useState<RuntimeStatus>("idle");
  const [dataStatus, setDataStatus] = useState<RuntimeStatus>("idle");

  const proxyBaseUrl = getProxyBaseUrl();
  const isPreviewEnvironment = typeof window !== "undefined" && window.location.hostname.includes("lovable.app");

  const syncStatusesFromError = (message: string) => {
    if (message.includes('/api/health')) {
      setProxyStatus("error");
      setDataStatus("idle");
      return;
    }

    if (message.includes('/api/por1/open-rows')) {
      setProxyStatus("online");
      setDataStatus("error");
      return;
    }

    if (message.includes('/api/por1/update-field')) {
      setDataStatus("error");
      return;
    }

    setProxyStatus("error");
    setDataStatus("error");
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setProxyStatus("checking");
    setDataStatus("checking");

    try {
      await checkProxyHealth();
      setProxyStatus("online");

      const [data, users] = await Promise.all([
        fetchOpenPOR1Rows(),
        fetchSapUsers().catch(() => []),
      ]);
      setRows(data);
      setSapUsers(users);
      setDataStatus("online");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      syncStatusesFromError(message);
      toast({ title: "Connection Error", description: getFriendlyError(message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    const safe = (v: unknown) => (v == null ? "" : String(v).toLowerCase());
    return rows.filter(
      (r) =>
        safe(r.DocNum).includes(term) ||
        safe(r.ItemCode).includes(term) ||
        safe(r.Dscription).includes(term) ||
        safe(r.CardName).includes(term) ||
        safe(r.CardCode).includes(term) ||
        safe(r.BlockNum).includes(term) ||
        safe(r.NumAtCard).includes(term) ||
        safe(r.U_PO_Notes_Intern).includes(term) ||
        safe(r.ShipDate).includes(term) ||
        safe(r.ShipDate?.split("T")[0]).includes(term)
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

  const handleUpdate = async (field: 'ShipDate' | 'Price' | 'LineTotal', value: string, updatedBy: string, sapPassword?: string) => {
    const selectedRowDetails = rows.filter((r) => selectedKeys.has(rowKey(r)));

    try {
      const result = await executeFieldUpdate(selectedRows, field, value, updatedBy, sapPassword);
      const successfulRowKeys = new Set(
        (result.details || []).flatMap((detail) =>
          (detail.lineNums || []).map((lineNum) => `${detail.docEntry}-${lineNum}`)
        )
      );
      const successfulRows = selectedRowDetails.filter((row) => successfulRowKeys.has(rowKey(row)));

      if (result.success || successfulRows.length > 0) {
        setError(null);
        setProxyStatus("online");
        setDataStatus("online");

        if (successfulRows.length > 0) {
          const changeSaved = await addChangeLogEntry({
            timestamp: new Date().toISOString(),
            updatedBy,
            newDate: `${field}=${value}`,
            rowCount: successfulRows.length,
            rows: successfulRows.map((row) => ({
              DocEntry: row.DocEntry,
              LineNum: row.LineNum,
              oldDate: row.ShipDate.split("T")[0],
            })),
          });

          if (!changeSaved) {
            toast({
              title: "Change Log Error",
              description: "The SAP update worked, but saving the internal change log failed.",
              variant: "destructive",
            });
          }
        }

        setRows((prev) =>
          prev.map((r) => {
            if (!successfulRowKeys.has(rowKey(r))) return r;
            if (field === 'ShipDate') return { ...r, ShipDate: value };
            if (field === 'Price') return { ...r, Price: parseFloat(value) };
            if (field === 'LineTotal') return { ...r, LineTotal: parseFloat(value) };
            return r;
          })
        );
        setSelectedKeys((prev) => new Set([...prev].filter((key) => !successfulRowKeys.has(key))));
        const fieldLabel = field === 'ShipDate' ? 'Delivery Date' : field === 'Price' ? 'Unit Price' : 'Total LC';
        const partialWarning = result.errors?.length ? ` ${result.errors.length} document(s) failed.` : '';
        toast({
          title: result.errors?.length ? `${fieldLabel} Partially Updated` : `${fieldLabel} Updated`,
          description: `${successfulRows.length} row(s) updated to ${value}.${partialWarning}`,
          variant: result.errors?.length ? "destructive" : "default",
        });
      } else {
        setDataStatus("error");
        const errDetail = result.errors?.map((e: any) => `DocEntry ${e.docEntry}: ${e.error}`).join('\n') || 'Unknown error';
        toast({ title: "Update Failed", description: errDetail, variant: "destructive" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      syncStatusesFromError(message);
      toast({ title: "Error", description: `Update failed: ${getFriendlyError(message)}`, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-normal uppercase mx-0">
              <span className="text-accent">TUUCI</span>
              <span className="mx-2 opacity-30">|</span>
              Delivery Date Mass Updater
            </h1>
            <p className="text-xs opacity-50 mt-0.5">Batch update delivery dates across open purchase order lines</p>
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

      <ConnectionStatus
        proxyBaseUrl={proxyBaseUrl}
        proxyStatus={proxyStatus}
        dataStatus={dataStatus}
        error={error}
        isPreviewEnvironment={isPreviewEnvironment}
      />

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
          Loading data...
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground px-4">
          <div className="text-center max-w-md">
            <p className="text-lg font-semibold text-destructive mb-2">Connection Failed</p>
            <p className="text-sm mb-1">{getFriendlyError(error)}</p>
            <p className="text-xs font-mono bg-muted rounded px-3 py-2 mt-2 break-all">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
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
        sapUsers={sapUsers}
      />

      {/* Change Log */}
      <ChangeLogPanel />
    </div>
  );
};

export default Index;