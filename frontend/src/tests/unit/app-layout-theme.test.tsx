import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/features/theme/theme.store";

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    getAdminToken: () => null
  };
});

vi.mock("@/features/auth/stores/auth.store", () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn()
  })
}));

describe("AppLayout theme toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    mockMatchMedia(false);
  });

  it("renders a header toggle that switches the document theme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>Home content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("manga.theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });
});

function mockMatchMedia(prefersLight: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === "(prefers-color-scheme: light)" ? prefersLight : false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })
  });
}
