export * from "./auth";

export interface DatabaseHealth {
  status: "connected" | "disconnected" | "degraded";
  latency_ms?: number;
  pgvector_enabled?: boolean;
  error?: string;
}

export interface RedisHealth {
  status: "connected" | "disconnected" | "degraded";
  latency_ms?: number;
  error?: string;
}

export interface AISubsystemHealth {
  status: "available" | "offline" | "degraded";
  latency_ms?: number;
  target_model: string;
  available_models?: string[];
  model_ready?: boolean;
  message?: string;
  error?: string;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  subsystems: {
    database: DatabaseHealth;
    redis: RedisHealth;
    ai_engine: AISubsystemHealth;
  };
}
