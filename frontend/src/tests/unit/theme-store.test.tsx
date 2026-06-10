import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "@/features/theme/theme.store";

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("uses system light preference on first visit", () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByText("light")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("uses stored preference before system preference", () => {
    localStorage.setItem("manga.theme", "dark");
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("toggles theme and persists the selection", async () => {
    const user = userEvent.setup();
    mockMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "toggle theme" }));

    expect(screen.getByText("light")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("manga.theme")).toBe("light");
  });
});

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span>{theme}</span>
      <button onClick={toggleTheme} type="button">
        toggle theme
      </button>
    </div>
  );
}

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
