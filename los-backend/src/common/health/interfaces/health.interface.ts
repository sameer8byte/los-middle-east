export interface HealthStatus {
  status: "ok" | "error" | "shutting_down";
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

export interface HealthCheckResult {
  status: "ok" | "error" | "shutting_down";
  info: Record<string, any>;
  error: Record<string, any>;
  details: Record<string, any>;
}

export interface DatabaseHealthIndicator {
  key: string;
  status: "up" | "down";
  message?: string;
  database?: {
    status: "up" | "down";
  };
}

export interface MemoryHealthIndicator {
  key: string;
  status: "up" | "down";
  used_memory: number;
  memory_limit: number;
  memory_usage_percentage: number;
}

export interface DiskHealthIndicator {
  key: string;
  status: "up" | "down";
  used_space: number;
  available_space: number;
  total_space: number;
  disk_usage_percentage: number;
}
