import { describe, expect, it } from "vitest";
import { buildAnswerSystemPrompt } from "../../domain/services/chat.service.js";

describe("buildAnswerSystemPrompt", () => {
  it("keeps chatbot answers concise and card-friendly", () => {
    const prompt = buildAnswerSystemPrompt();

    expect(prompt).toContain("under 90 words");
    expect(prompt).toContain("at most 3 items");
    expect(prompt).toContain("Do not use Markdown");
    expect(prompt).toContain("source cards are rendered separately");
    expect(prompt).toContain("- Title: one short reason from context.");
  });
});
