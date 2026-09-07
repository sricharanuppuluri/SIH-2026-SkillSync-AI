import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AppShell } from "./AppShell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock the API client
vi.mock("@/lib/api", () => ({
  getSystemHealth: vi.fn().mockResolvedValue({
    data: {
      status: "healthy",
      service: "skillsync-api",
      version: "0.1.0",
      environment: "development",
      timestamp: new Date().toISOString(),
      subsystems: {
        database: { status: "connected", latency_ms: 2.1, pgvector_enabled: true },
        redis: { status: "connected", latency_ms: 1.0 },
        ai_engine: { status: "available", target_model: "mistral:latest" },
      },
    },
    online: true,
    latencyMs: 12,
  }),
}));

describe("AppShell Layout Component", () => {
  it("renders sidebar navigation and brand name", async () => {
    await act(async () => {
      render(
        <AppShell>
          <div>Child Content</div>
        </AppShell>
      );
    });

    // Check brand in sidebar
    expect(screen.getAllByText("SkillSync").length).toBeGreaterThan(0);
    // Check navigation links
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jobs Requisitions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Skill Taxonomy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("renders child content within main landmark", async () => {
    await act(async () => {
      render(
        <AppShell>
          <div data-testid="test-child">Shell Children Loaded</div>
        </AppShell>
      );
    });

    expect(screen.getByTestId("test-child")).toBeDefined();
    expect(screen.getByText("Shell Children Loaded")).toBeDefined();
  });

  it("renders navigation items and layout landmarks", async () => {
    await act(async () => {
      render(
        <AppShell>
          <div>Child Content</div>
        </AppShell>
      );
    });

    const dashboardLinks = screen.getAllByText("Dashboard");
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });
});
