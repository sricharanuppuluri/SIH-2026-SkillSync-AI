import { HealthResponse } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generic fetch wrapper for SkillSync AI backend API calls.
 */
export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(
      response.status,
      `API request failed with status ${response.status}`,
      errorData
    );
  }

  return response.json();
}

/**
 * Health check probe connecting to GET /api/v1/health with graceful fallback.
 */
export async function getSystemHealth(): Promise<{
  data: HealthResponse | null;
  online: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = performance.now();
  try {
    const data = await fetchAPI<HealthResponse>("/api/v1/health");
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      data,
      online: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const message =
      err instanceof Error ? err.message : "Failed to connect to backend API";
    return {
      data: null,
      online: false,
      latencyMs,
      error: message,
    };
  }
}
