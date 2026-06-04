import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthPanel, Field } from "@/features/auth/pages/LoginPage";

describe("auth form UI", () => {
  it("renders a labelled email field", () => {
    render(
      <AuthPanel title="Test" footer={<span>Footer</span>}>
        <Field label="Email" value="" onChange={() => undefined} type="email" />
      </AuthPanel>
    );

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
