import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildIceServers } from "../../domain/services/call-ice.service.js";

describe("call ICE service", () => {
  it("returns STUN-only servers by default", () => {
    const servers = buildIceServers(
      {
        stunUrls: "stun:stun.l.google.com:19302",
        turnCredentialTtlSeconds: 3600
      },
      { callId: "call-1", userId: "user-1" }
    );

    expect(servers).toEqual([{ urls: ["stun:stun.l.google.com:19302"] }]);
  });

  it("ignores static TURN config until username and credential are both present", () => {
    const servers = buildIceServers(
      {
        stunUrls: "stun:stun.l.google.com:19302",
        turnUrls: "turn:turn.example.com:3478",
        turnUsername: "reader",
        turnCredentialTtlSeconds: 3600
      },
      { callId: "call-1", userId: "user-1" }
    );

    expect(servers).toEqual([{ urls: ["stun:stun.l.google.com:19302"] }]);
  });

  it("includes static TURN credentials when complete", () => {
    const servers = buildIceServers(
      {
        stunUrls: "stun:stun.l.google.com:19302",
        turnUrls: "turn:turn.example.com:3478, turns:turn.example.com:5349",
        turnUsername: "reader",
        turnCredential: "static-secret",
        turnCredentialTtlSeconds: 3600
      },
      { callId: "call-1", userId: "user-1" }
    );

    expect(servers).toEqual([
      { urls: ["stun:stun.l.google.com:19302"] },
      { urls: ["turn:turn.example.com:3478", "turns:turn.example.com:5349"], username: "reader", credential: "static-secret" }
    ]);
  });

  it("generates shared-secret TURN credentials with expiry", () => {
    const now = new Date("2026-07-01T12:00:00.000Z");
    const sharedSecret = "shared-turn-secret";
    const username = `${Math.floor(now.getTime() / 1000) + 600}:user-1:call-1`;
    const credential = createHmac("sha1", sharedSecret).update(username).digest("base64");

    const servers = buildIceServers(
      {
        stunUrls: "",
        turnUrls: "turn:turn.example.com:3478",
        turnUsername: "static-user",
        turnCredential: "static-secret",
        turnSharedSecret: sharedSecret,
        turnCredentialTtlSeconds: 600
      },
      { callId: "call-1", userId: "user-1", now }
    );

    expect(servers).toEqual([{ urls: ["turn:turn.example.com:3478"], username, credential }]);
  });
});
