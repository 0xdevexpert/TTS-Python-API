
import React from "react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gauge, Activity, Server, Clock, WifiOff } from "lucide-react";
import { format } from "date-fns";

const TTSHealthDashboard = () => {
  const { data, isLoading } = useHealthMetrics();

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Loading Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // If server is offline
  if (data.status === "offline") {
    return (
      <Card className="bg-destructive/10 border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Backend Server Offline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Cannot connect to the TTS backend server at {import.meta.env.VITE_API_BASE_URL}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Please make sure the FastAPI backend is running with: <code>uvicorn main:app --reload</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className={`${data.status === "healthy" ? "bg-secondary/30" : "bg-destructive/10"}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{data.status}</div>
          <p className="text-xs text-muted-foreground">
            {data.connected_clients} client{data.connected_clients !== 1 ? "s" : ""} connected
          </p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
          <Gauge className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.jobs_in_queue}</div>
          <p className="text-xs text-muted-foreground">Active jobs in queue</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.memory_usage.jobs_cache_size}</div>
          <p className="text-xs text-muted-foreground">Cached jobs</p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {format(new Date(data.server_time), "HH:mm:ss")}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(data.server_time), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TTSHealthDashboard;
