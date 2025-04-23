
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface HealthMetrics {
  status: string;
  jobs_in_queue: number;
  connected_clients: number;
  server_time: string;
  memory_usage: {
    jobs_cache_size: number;
  };
}

export const useHealthMetrics = () => {
  // Get the API base URL from environment
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
  return useQuery({
    queryKey: ["health"],
    queryFn: async (): Promise<HealthMetrics> => {
      try {
        const response = await axios.get(`${apiBaseUrl}/health`, {
          timeout: 5000 // Shorter timeout for health checks (5 seconds)
        });
        return response.data;
      } catch (error) {
        // Return a fallback status when server is unreachable
        console.error("Health check failed:", error);
        return {
          status: "offline",
          jobs_in_queue: 0,
          connected_clients: 0,
          server_time: new Date().toISOString(),
          memory_usage: {
            jobs_cache_size: 0
          }
        };
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchOnWindowFocus: true,
    retry: 1, // Only retry health check once
    staleTime: 2000, // Consider data stale after 2 seconds
  });
};
