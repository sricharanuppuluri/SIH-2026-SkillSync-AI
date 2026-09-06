import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Home from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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
    latencyMs: 15,
  }),
}));

describe("Dashboard Page & Application Shell Integration", () => {
  it("renders the primary dashboard welcome heading and ecosystem tagline", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Welcome to SkillSync")).toBeDefined();
    expect(
      screen.getByText("AI-Driven Workforce Intelligence")
    ).toBeDefined();
  });

  it("renders summary metric cards", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Active Opportunities")).toBeDefined();
    expect(screen.getByText("Skills in Taxonomy")).toBeDefined();
    expect(screen.getByText("Aligned Curricula")).toBeDefined();
    expect(screen.getByText("Match Efficiency")).toBeDefined();
  });

  it("renders live infrastructure and subsystem diagnostics", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Infrastructure Health & Subsystems")).toBeDefined();
    expect(screen.getByText("Frontend Shell")).toBeDefined();
    expect(screen.getByText("FastAPI Backend")).toBeDefined();
    expect(screen.getByText("PostgreSQL")).toBeDefined();
  });

  it("renders closed-loop ecosystem pipeline and quick action modules", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Closed-Loop Ecosystem Flow")).toBeDefined();
    expect(screen.getByText("Upcoming Platform Modules")).toBeDefined();
  });
});
