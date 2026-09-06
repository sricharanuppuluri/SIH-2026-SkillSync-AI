import {
  HealthResponse,
  LoginCredentials,
  RegisterData,
  TokenResponse,
  User,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "skillsync_auth_token";

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
 * Retrieves the stored JWT authentication token from localStorage if in client environment.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Persists or clears the JWT authentication token in localStorage.
 */
export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Generic fetch wrapper for SkillSync AI backend API calls with bearer token support.
 */
export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = getStoredToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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

    let detailMessage = `API request failed with status ${response.status}`;
    if (
      typeof errorData === "object" &&
      errorData !== null &&
      "detail" in errorData
    ) {
      const detail = (errorData as { detail: unknown }).detail;
      if (typeof detail === "string") {
        detailMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        detailMessage = detail[0].msg;
      }
    }

    throw new ApiError(response.status, detailMessage, errorData);
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

/**
 * Authentication API methods.
 */
export const authAPI = {
  async register(data: RegisterData): Promise<User> {
    return fetchAPI<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await fetchAPI<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setStoredToken(response.access_token);
    return response;
  },

  async getMe(): Promise<User> {
    return fetchAPI<User>("/api/v1/auth/me");
  },

  async logout(): Promise<void> {
    try {
      await fetchAPI<{ message: string; user_id: string }>("/api/v1/auth/logout", {
        method: "POST",
      });
    } catch {
      // Offline or expired session logout: local state still purged
    } finally {
      setStoredToken(null);
    }
  },
};

/**
 * Skills Taxonomy API methods.
 */
export const skillsAPI = {
  async list(params?: { search?: string; category?: string }): Promise<import("@/types").Skill[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    const qs = query.toString();
    return fetchAPI<import("@/types").Skill[]>(`/api/v1/skills${qs ? `?${qs}` : ""}`);
  },
};

/**
 * Employer Portal API methods.
 */
export const employerAPI = {
  async getDashboard(): Promise<import("@/types").EmployerDashboardData> {
    return fetchAPI<import("@/types").EmployerDashboardData>("/api/v1/employer/dashboard");
  },

  async getJobs(params?: {
    status?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<import("@/types").Job[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.skip !== undefined) query.set("skip", params.skip.toString());
    if (params?.limit !== undefined) query.set("limit", params.limit.toString());
    const qs = query.toString();
    return fetchAPI<import("@/types").Job[]>(`/api/v1/employer/jobs${qs ? `?${qs}` : ""}`);
  },

  async getJob(jobId: string): Promise<import("@/types").Job> {
    return fetchAPI<import("@/types").Job>(`/api/v1/employer/jobs/${jobId}`);
  },

  async createJob(payload: import("@/types").JobCreatePayload): Promise<import("@/types").Job> {
    return fetchAPI<import("@/types").Job>("/api/v1/employer/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateJob(
    jobId: string,
    payload: import("@/types").JobUpdatePayload
  ): Promise<import("@/types").Job> {
    return fetchAPI<import("@/types").Job>(`/api/v1/employer/jobs/${jobId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async publishJob(jobId: string): Promise<import("@/types").Job> {
    return fetchAPI<import("@/types").Job>(`/api/v1/employer/jobs/${jobId}/publish`, {
      method: "PUT",
    });
  },

  async closeJob(jobId: string): Promise<import("@/types").Job> {
    return fetchAPI<import("@/types").Job>(`/api/v1/employer/jobs/${jobId}/close`, {
      method: "PUT",
    });
  },

  async deleteJob(jobId: string): Promise<{ message: string; id: string }> {
    return fetchAPI<{ message: string; id: string }>(`/api/v1/employer/jobs/${jobId}`, {
      method: "DELETE",
    });
  },

  async getApplications(params?: {
    jobId?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<import("@/types").EmployerApplication[]> {
    const query = new URLSearchParams();
    if (params?.jobId) query.set("job_id", params.jobId);
    if (params?.status) query.set("status", params.status);
    if (params?.skip !== undefined) query.set("skip", params.skip.toString());
    if (params?.limit !== undefined) query.set("limit", params.limit.toString());
    const qs = query.toString();
    return fetchAPI<import("@/types").EmployerApplication[]>(
      `/api/v1/employer/applications${qs ? `?${qs}` : ""}`
    );
  },

  async getJobApplications(
    jobId: string,
    status?: string
  ): Promise<import("@/types").EmployerApplication[]> {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    const qs = query.toString();
    return fetchAPI<import("@/types").EmployerApplication[]>(
      `/api/v1/employer/jobs/${jobId}/applications${qs ? `?${qs}` : ""}`
    );
  },

  async updateApplicationStatus(
    applicationId: string,
    status: import("@/types").ApplicationStatus
  ): Promise<import("@/types").EmployerApplication> {
    return fetchAPI<import("@/types").EmployerApplication>(
      `/api/v1/employer/applications/${applicationId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );
  },

  async getProfile(): Promise<{ role: string; profile: import("@/types").EmployerProfile }> {
    return fetchAPI<{ role: string; profile: import("@/types").EmployerProfile }>(
      "/api/v1/profiles/me"
    );
  },

  async updateProfile(
    payload: import("@/types").EmployerProfileUpdatePayload
  ): Promise<import("@/types").EmployerProfile> {
    return fetchAPI<import("@/types").EmployerProfile>("/api/v1/profiles/me/employer", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
