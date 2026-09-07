import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractQualityBadge } from "./ContractQualityBadge";
import { ContractRequirementsTable } from "./ContractRequirementsTable";
import { ContractVersionTimeline } from "./ContractVersionTimeline";
import { SkillContractCard } from "./SkillContractCard";
import { ContractInsightsPanel } from "./ContractInsightsPanel";
import {
  ContractInsightsResponse,
  ContractQualityScore,
  SkillContractSummary,
} from "@/types";

describe("Phase 16 Skill Contract UI Components", () => {
  it("renders ContractQualityBadge with score and rating", () => {
    const mockQuality: ContractQualityScore = {
      score: 95,
      rating: "EXCELLENT",
      explanation: ["All requirements have proficiency", "All critical skills have evidence"],
      total_requirements: 4,
      has_proficiency_specified: true,
      has_evidence_specified: true,
      duplicate_skills_detected: false,
    };

    render(<ContractQualityBadge quality={mockQuality} showExplanation={true} />);

    expect(screen.getByText(/Quality Score: 95\/100/i)).toBeDefined();
    expect(screen.getByText(/EXCELLENT/i)).toBeDefined();
    expect(screen.getByText(/All requirements have proficiency/i)).toBeDefined();
  });

  it("renders ContractRequirementsTable with items and badges", () => {
    const mockRequirements = [
      {
        skill_id: "s-1",
        skill_name: "Python",
        category: "Programming Language",
        required_proficiency: "ADVANCED",
        requirement_type: "REQUIRED" as const,
        importance: "CRITICAL" as const,
        evidence_type: "VERIFIED_SKILL" as const,
        minimum_experience_months: 24,
        notes: "Production backend experience",
      },
      {
        skill_id: "s-2",
        skill_name: "Docker",
        category: "DevOps",
        required_proficiency: "INTERMEDIATE",
        requirement_type: "PREFERRED" as const,
        importance: "MEDIUM" as const,
        evidence_type: "NONE" as const,
        minimum_experience_months: 0,
        notes: null,
      },
    ];

    render(<ContractRequirementsTable requirements={mockRequirements} isEditable={true} />);

    expect(screen.getByText("Python")).toBeDefined();
    expect(screen.getByText("Docker")).toBeDefined();
    expect(screen.getByText("REQUIRED")).toBeDefined();
    expect(screen.getByText("PREFERRED")).toBeDefined();
    expect(screen.getByText("Passport Verified")).toBeDefined();
    expect(screen.getByText("24 mos")).toBeDefined();
  });

  it("renders ContractVersionTimeline with history versions", () => {
    const mockHistory: SkillContractSummary[] = [
      {
        id: "c-1",
        job_id: "j-100",
        employer_id: "emp-1",
        version: 1,
        status: "ARCHIVED",
        total_requirements: 2,
        required_skills_count: 2,
        critical_skills_count: 1,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "c-2",
        job_id: "j-100",
        employer_id: "emp-1",
        version: 2,
        status: "ACTIVE",
        total_requirements: 3,
        required_skills_count: 2,
        critical_skills_count: 2,
        created_at: "2026-09-05T00:00:00Z",
        updated_at: "2026-09-05T00:00:00Z",
      },
    ];

    render(<ContractVersionTimeline history={mockHistory} currentContractId="c-2" />);

    expect(screen.getByText("Version 1")).toBeDefined();
    expect(screen.getByText("Version 2")).toBeDefined();
    expect(screen.getByText("Current View")).toBeDefined();
    expect(screen.getByText("ARCHIVED")).toBeDefined();
  });

  it("renders SkillContractCard with summary metrics", () => {
    const mockSummary: SkillContractSummary = {
      id: "c-card-1",
      job_id: "j-200",
      job_title: "Staff AI Engineer",
      employer_id: "emp-1",
      title: "Core AI Contract",
      version: 1,
      status: "ACTIVE",
      total_requirements: 5,
      required_skills_count: 4,
      critical_skills_count: 2,
      created_at: "2026-09-07T00:00:00Z",
      updated_at: "2026-09-07T00:00:00Z",
    };

    render(<SkillContractCard contract={mockSummary} />);

    expect(screen.getByText("Core AI Contract")).toBeDefined();
    expect(screen.getByText("Job: Staff AI Engineer")).toBeDefined();
    expect(screen.getByText("v1")).toBeDefined();
    expect(screen.getByText("ACTIVE")).toBeDefined();
  });

  it("renders ContractInsightsPanel with market supply and simulation triggers", () => {
    const mockInsights: ContractInsightsResponse = {
      contract_id: "c-ins-1",
      job_id: "j-300",
      job_title: "Data Architect",
      version: 1,
      status: "ACTIVE",
      total_skills: 2,
      required_skills_count: 2,
      preferred_skills_count: 0,
      critical_skills_count: 1,
      high_priority_count: 1,
      verified_evidence_requirements_count: 1,
      average_proficiency: "ADVANCED",
      skill_type_distribution: { TECHNICAL: 2 },
      category_distribution: { Database: 1, Cloud: 1 },
      completeness_score: 90,
      market_insights: [
        {
          skill_id: "s-sql",
          skill_name: "PostgreSQL",
          category: "Database",
          required_proficiency: "ADVANCED",
          importance: "CRITICAL",
          evidence_type: "VERIFIED_SKILL",
          current_demand: 15,
          verified_supply: 4,
          unverified_supply: 10,
          shortage_category: "HIGH_SHORTAGE",
          forecast_demand: 22,
          forecast_growth_trend: "RAPID_GROWTH",
          forecast_shortage: "HIGH_SHORTAGE",
          training_courses_available: 3,
        },
      ],
    };

    render(<ContractInsightsPanel insights={mockInsights} />);

    expect(screen.getByText("PostgreSQL")).toBeDefined();
    expect(screen.getByText("HIGH_SHORTAGE")).toBeDefined();
    expect(screen.getByText("3 courses")).toBeDefined();
    expect(screen.getByText("Simulate")).toBeDefined();
  });
});
