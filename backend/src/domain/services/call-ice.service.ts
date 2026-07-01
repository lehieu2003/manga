import { createHmac } from "node:crypto";
import { env } from "../../shared/configs/app.config.js";

export type IceServerConfig = {
  stunUrls?: string;
  turnUrls?: string;
  turnUsername?: string;
  turnCredential?: string;
  turnSharedSecret?: string;
  turnCredentialTtlSeconds: number;
};

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

type CallIceInput = {
  callId: string;
  userId: string;
  now?: Date;
};

export function getCallIceServers(input: CallIceInput) {
  return buildIceServers(
    {
      stunUrls: env.CALL_STUN_URLS,
      turnUrls: env.CALL_TURN_URLS,
      turnUsername: env.CALL_TURN_USERNAME,
      turnCredential: env.CALL_TURN_CREDENTIAL,
      turnSharedSecret: env.CALL_TURN_SHARED_SECRET,
      turnCredentialTtlSeconds: env.CALL_TURN_CREDENTIAL_TTL_SECONDS
    },
    input
  );
}

export function buildIceServers(config: IceServerConfig, input: CallIceInput): IceServer[] {
  const servers: IceServer[] = [];
  const stunUrls = splitCsv(config.stunUrls);
  if (stunUrls.length) servers.push({ urls: stunUrls });

  const turnUrls = splitCsv(config.turnUrls);
  if (!turnUrls.length) return servers;

  if (config.turnSharedSecret) {
    servers.push({
      urls: turnUrls,
      ...generateTurnCredentials({
        sharedSecret: config.turnSharedSecret,
        ttlSeconds: config.turnCredentialTtlSeconds,
        userId: input.userId,
        callId: input.callId,
        now: input.now
      })
    });
    return servers;
  }

  if (config.turnUsername && config.turnCredential) {
    servers.push({ urls: turnUrls, username: config.turnUsername, credential: config.turnCredential });
  }

  return servers;
}

function generateTurnCredentials(input: { sharedSecret: string; ttlSeconds: number; userId: string; callId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const expiresAtSeconds = Math.floor(now.getTime() / 1000) + input.ttlSeconds;
  const username = `${expiresAtSeconds}:${input.userId}:${input.callId}`;
  const credential = createHmac("sha1", input.sharedSecret).update(username).digest("base64");
  return { username, credential };
}

function splitCsv(value: string | undefined) {
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}
