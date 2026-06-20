import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, getRefreshToken, setTokens } from "@/api";
import { AuthProvider, useAuth } from "@/features/auth/stores/auth.store";

const apiMock = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateMe: vi.fn(),
  changePassword: vi.fn()
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      me: apiMock.me,
      login: apiMock.login,
      register: apiMock.register,
      logout: apiMock.logout,
      updateMe: apiMock.updateMe,
      changePassword: apiMock.changePassword
    }
  };
});

describe("AuthProvider account actions", () => {
  beforeEach(() => {
    localStorage.clear();
    apiMock.me.mockReset();
    apiMock.login.mockReset();
    apiMock.register.mockReset();
    apiMock.logout.mockReset();
    apiMock.updateMe.mockReset();
    apiMock.changePassword.mockReset();
  });

  it("stores fresh tokens and updates the user after password change", async () => {
    apiMock.changePassword.mockResolvedValue({
      user: makeUser({ displayName: "Reader Prime" }),
      accessToken: "new-access",
      refreshToken: "new-refresh"
    });
    renderAuthProbe();

    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(getAccessToken()).toBe("new-access");
    expect(getRefreshToken()).toBe("new-refresh");
    expect(await screen.findByText("Reader Prime")).toBeInTheDocument();
  });

  it("calls backend logout and clears local session even when revoke fails", async () => {
    setTokens("old-access", "old-refresh");
    apiMock.me.mockResolvedValue({ user: makeUser() });
    apiMock.logout.mockRejectedValue(new Error("already revoked"));
    renderAuthProbe();

    expect(await screen.findByText("Reader")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(apiMock.logout).toHaveBeenCalledWith("old-refresh");
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(await screen.findByText("anonymous")).toBeInTheDocument();
  });
});

function renderAuthProbe() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );
}

function AuthProbe() {
  const { user, changePassword, logout } = useAuth();
  return (
    <div>
      <span>{user?.displayName ?? "anonymous"}</span>
      <button onClick={() => changePassword({ currentPassword: "old-password", newPassword: "new-password-1" })}>Change password</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

function makeUser(overrides: Partial<ReturnType<typeof makeBaseUser>> = {}) {
  return { ...makeBaseUser(), ...overrides };
}

function makeBaseUser() {
  return {
    id: "user-1",
    email: "reader@example.com",
    displayName: "Reader",
    role: "USER",
    avatarUrl: null,
    emailVerifiedAt: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z"
  };
}
