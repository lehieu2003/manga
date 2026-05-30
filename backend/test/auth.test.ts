import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/modules/auth/auth.service.js";

describe("password hashing", () => {
  it("verifies the original password and rejects another password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
