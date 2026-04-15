import { Activity, Database, WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type StatusState = "idle" | "checking" | "online" | "error";

interface ConnectionStatusProps {
  proxyBaseUrl: string;
  proxyStatus: StatusState;
  dataStatus: StatusState;
  error: string | null;
  isPreviewEnvironment: boolean;
}

function StatusBadge({ label, status }: { label: string; status: StatusState }) {
  const dotClassName =
    status === "online"
      ? "bg-success"
      : status === "checking"
        ? "bg-warning"
        : status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground";

  const text =
    status === "online"
      ? "Online"
      : status === "checking"
        ? "Checking"
        : status === "error"
          ? "Offline"
          : "Idle";

  return (
    <Badge variant="outline" className="gap-2 rounded-full bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
      <span className={`h-2 w-2 rounded-full ${dotClassName}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="text-muted-foreground">{text}</span>
    </Badge>
  );
}

const ConnectionStatus = ({
  proxyBaseUrl,
  proxyStatus,
  dataStatus,
  error,
  isPreviewEnvironment,
}: ConnectionStatusProps) => {
  return (
    <div className="border-b border-border bg-muted/40 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Proxy" status={proxyStatus} />
          <StatusBadge label="Data" status={dataStatus} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono break-all">
          <Activity className="h-4 w-4 shrink-0" />
          <span>{proxyBaseUrl}</span>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-3 border-destructive/30 bg-background">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Connection problem</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            {isPreviewEnvironment ? (
              <p className="text-muted-foreground">
                The Lovable preview cannot reach your internal network proxy. Open the app from your internal server or set <span className="font-mono">VITE_POR1_PROXY_URL</span> during deployment.
              </p>
            ) : null}
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Database className="h-4 w-4 shrink-0" />
              <span>Target endpoint: {proxyBaseUrl}</span>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default ConnectionStatus;