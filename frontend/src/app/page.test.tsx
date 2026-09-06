import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Home from "./page";

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

describe("Home Page Foundation Shell", () => {
  it("renders the primary SkillSync AI heading and tagline", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("SkillSync")).toBeDefined();
    expect(
      screen.getByText("AI-Powered Skill Development & Employment Ecosystem")
    ).toBeDefined();
  });

  it("renders subsystem diagnostic monitor", async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText("Runtime Subsystem Diagnostics")).toBeDefined();
    expect(screen.getByText("Frontend Shell")).toBeDefined();
    expect(screen.getByText("FastAPI Backend")).toBeDefined();
    expect(screen.getByText("PostgreSQL + pgvector")).toBeDefined();
  });
});
