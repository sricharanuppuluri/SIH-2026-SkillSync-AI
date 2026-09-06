import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { User } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock the API client
const mockGetMe = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock("@/lib/api", () => ({
  authAPI: {
    getMe: () => mockGetMe(),
    login: (creds: unknown) => mockLogin(creds),
    logout: () => mockLogout(),
    register: vi.fn(),
  },
  getStoredToken: () => localStorage.getItem("skillsync_auth_token"),
  setStoredToken: (token: string | null) => {
    if (token) localStorage.setItem("skillsync_auth_token", token);
    else localStorage.removeItem("skillsync_auth_token");
  },
  getSystemHealth: vi.fn().mockResolvedValue({
    data: {
      status: "healthy",
      service: "skillsync-api",
      version: "0.1.0",
      environment: "development",
      timestamp: new Date().toISOString(),
      subsystems: {
        database: { status: "connected" },
        redis: { status: "connected" },
        ai_engine: { status: "available" },
      },
    },
    online: true,
    latencyMs: 10,
  }),
}));

const dummyUser: User = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  email: "emp@techinnovate.com",
  full_name: "Tech Recruiter",
  role: "EMPLOYER",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Authentication State & Role-Aware Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("restores user session on mount when token exists in storage", async () => {
    localStorage.setItem("skillsync_auth_token", "dummy-jwt-token");
    mockGetMe.mockResolvedValueOnce(dummyUser);

    function TestConsumer() {
      const { user, isAuthenticated, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return (
        <div>
          <span>{isAuthenticated ? "Authenticated" : "Guest"}</span>
          <span>{user?.email}</span>
        </div>
      );
    }

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByText("Authenticated")).toBeDefined();
    expect(screen.getByText("emp@techinnovate.com")).toBeDefined();
  });

  it("filters sidebar navigation links based on EMPLOYER role", async () => {
    localStorage.setItem("skillsync_auth_token", "dummy-jwt-token");
    mockGetMe.mockResolvedValueOnce(dummyUser);

    await act(async () => {
      render(
        <AuthProvider>
          <Sidebar collapsed={false} onToggleCollapse={() => {}} />
        </AuthProvider>
      );
    });

    // Employer allowed modules
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jobs Requisitions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Semantic Matching").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);

    // Modules hidden for Employer role
    expect(screen.queryByText("Skill Taxonomy")).toBeNull();
    expect(screen.queryByText("Curriculum & Courses")).toBeNull();
    expect(screen.queryByText("Skill Passport")).toBeNull();
    expect(screen.queryByText("Outcome Analytics")).toBeNull();
  });

  it("displays user profile and logout button in Header when authenticated", async () => {
    localStorage.setItem("skillsync_auth_token", "dummy-jwt-token");
    mockGetMe.mockResolvedValueOnce(dummyUser);

    await act(async () => {
      render(
        <AuthProvider>
          <Header onOpenMobileNav={() => {}} />
        </AuthProvider>
      );
    });

    expect(screen.getByText("Tech Recruiter")).toBeDefined();
    expect(screen.getByText("EMPLOYER")).toBeDefined();
    expect(screen.getByRole("button", { name: /logout/i })).toBeDefined();
  });

  it("clears user and storage on logout", async () => {
    localStorage.setItem("skillsync_auth_token", "dummy-jwt-token");
    mockGetMe.mockResolvedValueOnce(dummyUser);
    mockLogout.mockResolvedValueOnce(undefined);

    function LogoutTest() {
      const { isAuthenticated, logout } = useAuth();
      return (
        <div>
          <span>{isAuthenticated ? "Logged In" : "Logged Out"}</span>
          <button onClick={() => logout()}>Perform Logout</button>
        </div>
      );
    }

    await act(async () => {
      render(
        <AuthProvider>
          <LogoutTest />
        </AuthProvider>
      );
    });

    expect(screen.getByText("Logged In")).toBeDefined();

    await act(async () => {
      screen.getByRole("button", { name: "Perform Logout" }).click();
    });

    expect(screen.getByText("Logged Out")).toBeDefined();
    expect(localStorage.getItem("skillsync_auth_token")).toBeNull();
  });
});
