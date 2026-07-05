import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, getRefreshToken, setTokens } from "@/api";
import { AuthProvider, useAuth } from "@/features/auth/stores/auth.store";

const apiMock = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  exchangeFirebaseToken: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateMe: vi.fn(),
  changePassword: vi.fn()
}));

const firebaseMock = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  clearFirebaseAuthSession: vi.fn()
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      me: apiMock.me,
      login: apiMock.login,
      exchangeFirebaseToken: apiMock.exchangeFirebaseToken,
      register: apiMock.register,
      logout: apiMock.logout,
      updateMe: apiMock.updateMe,
      changePassword: apiMock.changePassword
    }
  };
});

vi.mock("@/features/auth/firebase.client", () => ({
  signInWithGoogle: firebaseMock.signInWithGoogle,
  clearFirebaseAuthSession: firebaseMock.clearFirebaseAuthSession
}));

describe("AuthProvider account actions", () => {
  beforeEach(() => {
    localStorage.clear();
    apiMock.me.mockReset();
    apiMock.login.mockReset();
    apiMock.exchangeFirebaseToken.mockReset();
    apiMock.register.mockReset();
    apiMock.logout.mockReset();
    apiMock.updateMe.mockReset();
    apiMock.changePassword.mockReset();
    firebaseMock.signInWithGoogle.mockReset();
    firebaseMock.clearFirebaseAuthSession.mockReset();
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

  it("exchanges a Google sign-in token for backend tokens", async () => {
    firebaseMock.signInWithGoogle.mockResolvedValue("firebase-id-token");
    apiMock.exchangeFirebaseToken.mockResolvedValue({
      user: makeUser({ displayName: "Google Reader", hasPassword: false }),
      accessToken: "google-access",
      refreshToken: "google-refresh"
    });
    renderAuthProbe();

    await userEvent.click(screen.getByRole("button", { name: "Google login" }));

    expect(apiMock.exchangeFirebaseToken).toHaveBeenCalledWith({ idToken: "firebase-id-token" });
    expect(getAccessToken()).toBe("google-access");
    expect(getRefreshToken()).toBe("google-refresh");
    expect(await screen.findByText("Google Reader")).toBeInTheDocument();
  });

  it("keeps existing backend tokens when Google exchange fails", async () => {
    setTokens("old-access", "old-refresh");
    apiMock.me.mockResolvedValue({ user: makeUser() });
    firebaseMock.signInWithGoogle.mockResolvedValue("firebase-id-token");
    apiMock.exchangeFirebaseToken.mockRejectedValue(new Error("Exchange failed"));
    renderAuthProbe();

    expect(await screen.findByText("Reader")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Google login" }));

    expect(getAccessToken()).toBe("old-access");
    expect(getRefreshToken()).toBe("old-refresh");
    expect(firebaseMock.clearFirebaseAuthSession).toHaveBeenCalled();
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
  const { user, changePassword, loginWithGoogle, logout } = useAuth();
  return (
    <div>
      <span>{user?.displayName ?? "anonymous"}</span>
      <button onClick={() => changePassword({ currentPassword: "old-password", newPassword: "new-password-1" })}>Change password</button>
      <button onClick={() => loginWithGoogle().catch(() => undefined)}>Google login</button>
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
    hasPassword: true,
    createdAt: "2024-01-01T00:00:00.000Z"
  };
}
