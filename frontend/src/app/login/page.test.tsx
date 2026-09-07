import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const mockPush = vi.fn();
const mockLogin = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

let mockAuthState = {
  login: mockLogin,
  isAuthenticated: false,
  isLoading: false,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

describe("LoginPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it("renders email, password inputs, submit button, and registration link", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("Email Address")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
    expect(screen.getByText(/register here/i)).toBeDefined();
  });

  it("shows validation error if submitted empty", async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Please enter both email and password.")
      ).toBeDefined();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("submits valid credentials and triggers navigation on success", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email Address");
    const passInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password123!",
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("displays API authentication error message on failure", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid email or password"));
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email Address");
    const passInput = screen.getByLabelText("Password");
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passInput, { target: { value: "wrongpass" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeDefined();
    });
  });

  it("redirects immediately if already authenticated", () => {
    mockAuthState = {
      login: mockLogin,
      isAuthenticated: true,
      isLoading: false,
    };
    render(<LoginPage />);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
