import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";

const mockPush = vi.fn();
const mockRegister = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

let mockAuthState = {
  register: mockRegister,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

describe("RegisterPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      register: mockRegister,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it("renders registration form and excludes ADMIN role from options", () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Account Role")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeDefined();

    // Critical security check: ADMIN option must not exist
    const options = screen.getAllByRole("option");
    const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);
    expect(optionValues).not.toContain("ADMIN");
    expect(optionValues).toContain("CANDIDATE");
    expect(optionValues).toContain("EMPLOYER");
    expect(optionValues).toContain("TRAINING_PROVIDER");
    expect(optionValues).toContain("GOVERNMENT");
  });

  it("validates that password must be at least 8 characters", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Test Candidate" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cand@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "short" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters long.")
      ).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("validates that password and confirm password match", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Test Candidate" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "cand@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "ValidPassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "DifferentPassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeDefined();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("submits valid registration and redirects to dashboard", async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Aarav Sharma" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "aarav@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "SecurePassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "SecurePassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        full_name: "Aarav Sharma",
        email: "aarav@example.com",
        password: "SecurePassword123!",
        role: "CANDIDATE",
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
