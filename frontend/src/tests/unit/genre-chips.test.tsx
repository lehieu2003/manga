import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { GenreChips } from "@/features/catalog/components/GenreChips";

const genres = [
  { name: "Action", count: 12 },
  { name: "Slice of Life", count: 8 }
];

describe("GenreChips", () => {
  it("renders genre links for browsing", () => {
    render(
      <MemoryRouter>
        <GenreChips genres={genres} />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Action, 12 manga/ })).toHaveAttribute("href", "/genres/Action");
    expect(screen.getByRole("link", { name: /Slice of Life, 8 manga/ })).toHaveAttribute("href", "/genres/Slice%20of%20Life");
  });

  it("toggles selected genres in filter mode", async () => {
    const onToggle = vi.fn();
    render(
      <MemoryRouter>
        <GenreChips genres={genres} selected={["Action"]} onToggle={onToggle} />
      </MemoryRouter>
    );

    const action = screen.getByRole("button", { name: /Action, 12 manga/ });
    expect(action).toHaveClass("genre-chip-active");

    await userEvent.click(screen.getByRole("button", { name: /Slice of Life, 8 manga/ }));
    expect(onToggle).toHaveBeenCalledWith("Slice of Life");
  });
});
