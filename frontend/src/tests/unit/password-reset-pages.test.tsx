import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";

const apiMock = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn()
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      forgotPassword: apiMock.forgotPassword,
      resetPassword: apiMock.resetPassword
    }
  };
});

describe("password reset pages", () => {
  beforeEach(() => {
    apiMock.forgotPassword.mockReset();
    apiMock.resetPassword.mockReset();
  });

  it("requests a password reset link without revealing account existence", async () => {
    apiMock.forgotPassword.mockResolvedValue({ ok: true });
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Email"), "reader@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(apiMock.forgotPassword).toHaveBeenCalledWith({ email: "reader@example.com" });
    expect(await screen.findByText(/If an account exists/i)).toBeInTheDocument();
  });

  it("submits a new password with the reset token", async () => {
    apiMock.resetPassword.mockResolvedValue({ ok: true });
    render(
      <MemoryRouter initialEntries={["/reset-password?token=reset-token-long-enough"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("New password"), "new-password-1");
    await userEvent.type(screen.getByLabelText("Confirm password"), "new-password-1");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(apiMock.resetPassword).toHaveBeenCalledWith({
      token: "reset-token-long-enough",
      newPassword: "new-password-1"
    });
    expect(await screen.findByText(/Your password has been reset/i)).toBeInTheDocument();
  });

  it("blocks mismatched reset passwords before calling the API", async () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=reset-token-long-enough"]}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("New password"), "new-password-1");
    await userEvent.type(screen.getByLabelText("Confirm password"), "different-password");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(apiMock.resetPassword).not.toHaveBeenCalled();
  });
});
