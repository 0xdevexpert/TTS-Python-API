
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
  return useQuery({
    queryKey: ["health"],
    queryFn: async (): Promise<HealthMetrics> => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/health`);
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};
