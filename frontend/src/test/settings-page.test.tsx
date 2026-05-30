import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { SettingsPage } from "../pages/SettingsPage";

const authState = vi.hoisted(() => ({
  user: { id: "user-1", email: "reader@example.com", displayName: "Reader", avatarUrl: null, createdAt: "2024-01-01T00:00:00.000Z" },
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn()
}));

vi.mock("../state/auth", () => ({
  useAuth: () => authState
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    authState.user = { id: "user-1", email: "reader@example.com", displayName: "Reader", avatarUrl: null, createdAt: "2024-01-01T00:00:00.000Z" };
    authState.updateProfile.mockReset().mockResolvedValue(undefined);
    authState.changePassword.mockReset().mockResolvedValue(undefined);
    authState.logout.mockReset().mockResolvedValue(undefined);
  });

  it("renders current account identity", () => {
    renderSettings();

    expect(screen.getByDisplayValue("reader@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Reader")).toBeInTheDocument();
  });

  it("saves display name and avatar URL", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Shelf Keeper");
    await user.type(screen.getByLabelText("Avatar URL"), "https://example.com/avatar.png");
    await user.click(screen.getByRole("button", { name: /Save profile/ }));

    expect(authState.updateProfile).toHaveBeenCalledWith({ displayName: "Shelf Keeper", avatarUrl: "https://example.com/avatar.png" });
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
  });

  it("validates password confirmation mismatch before calling the API", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText("Current password"), "old-password");
    await user.type(screen.getByLabelText("New password"), "new-password-1");
    await user.type(screen.getByLabelText("Confirm new password"), "new-password-2");
    await user.click(screen.getByRole("button", { name: /Change password/ }));

    expect(authState.changePassword).not.toHaveBeenCalled();
    expect(screen.getByText("New password confirmation does not match.")).toBeInTheDocument();
  });

  it("calls account logout from the session section", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(authState.logout).toHaveBeenCalledTimes(1);
  });

  it("redirects anonymous users away from protected settings", () => {
    authState.user = null as unknown as typeof authState.user;
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });
});

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}
