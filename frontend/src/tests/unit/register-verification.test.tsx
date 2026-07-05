import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, getRefreshToken } from "@/api";
import { AuthProvider } from "@/features/auth/stores/auth.store";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

const apiMock = vi.hoisted(() => ({
  me: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn()
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      me: apiMock.me,
      register: apiMock.register,
      verifyEmail: apiMock.verifyEmail,
      resendVerification: apiMock.resendVerification
    }
  };
});

describe("registration email verification", () => {
  beforeEach(() => {
    localStorage.clear();
    apiMock.me.mockReset();
    apiMock.register.mockReset();
    apiMock.verifyEmail.mockReset();
    apiMock.resendVerification.mockReset();
  });

  it("registers, prompts for OTP, verifies, and stores tokens", async () => {
    apiMock.register.mockResolvedValue({
      pendingVerification: true,
      email: "reader@example.com",
      expiresAt: "2024-01-01T00:10:00.000Z"
    });
    apiMock.verifyEmail.mockResolvedValue({
      user: makeUser(),
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Display name"), "Reader");
    await userEvent.type(screen.getByLabelText("Email"), "reader@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password-1");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText(/Enter the 6-digit code sent to reader@example.com/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Verification code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify account" }));

    await waitFor(() => expect(apiMock.verifyEmail).toHaveBeenCalledWith({ email: "reader@example.com", code: "123456" }));
    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
  });
});

function makeUser() {
  return {
    id: "user-1",
    email: "reader@example.com",
    displayName: "Reader",
    role: "USER",
    avatarUrl: null,
    emailVerifiedAt: "2024-01-01T00:00:00.000Z",
    hasPassword: true,
    createdAt: "2024-01-01T00:00:00.000Z"
  };
}
