import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EmployerProfilePage from "./page";
import { employerAPI } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  employerAPI: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const mockProfileResponse = {
  role: "EMPLOYER",
  profile: {
    id: "prof-1",
    user_id: "user-1",
    company_name: "Apex AI Technologies",
    company_description: "Leading AI workforce platform",
    industry: "Artificial Intelligence",
    location_city: "Seattle",
    location_state: "WA",
    website_url: "https://apexai.io",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

describe("EmployerProfilePage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and populates existing company profile fields", async () => {
    vi.mocked(employerAPI.getProfile).mockResolvedValueOnce(mockProfileResponse);
    render(<EmployerProfilePage />);

    await waitFor(() => {
      const companyInput = screen.getByPlaceholderText("e.g. Acme Tech Solutions Inc.") as HTMLInputElement;
      expect(companyInput.value).toBe("Apex AI Technologies");
      const industryInput = screen.getByPlaceholderText("e.g. Artificial Intelligence, FinTech, Healthcare") as HTMLInputElement;
      expect(industryInput.value).toBe("Artificial Intelligence");
      const cityInput = screen.getByPlaceholderText("e.g. Austin") as HTMLInputElement;
      expect(cityInput.value).toBe("Seattle");
    });
  });

  it("submits updated company profile data", async () => {
    vi.mocked(employerAPI.getProfile).mockResolvedValueOnce(mockProfileResponse);
    vi.mocked(employerAPI.updateProfile).mockResolvedValueOnce({
      ...mockProfileResponse.profile,
      company_name: "Apex AI Global",
    });

    render(<EmployerProfilePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g. Acme Tech Solutions Inc.")).toBeDefined();
    });

    const companyInput = screen.getByPlaceholderText("e.g. Acme Tech Solutions Inc.");
    fireEvent.change(companyInput, { target: { value: "Apex AI Global" } });

    const submitBtn = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(employerAPI.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          company_name: "Apex AI Global",
        })
      );
      expect(screen.getByText("Company profile updated successfully!")).toBeDefined();
    });
  });
});
