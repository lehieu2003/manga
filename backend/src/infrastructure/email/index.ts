import tls from "node:tls";
import { env } from "../../shared/configs/app.config.js";

export type PasswordResetEmail = {
  to: string;
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
};

export type EmailVerificationOtpEmail = {
  to: string;
  displayName: string;
  code: string;
  expiresAt: Date;
};

export type EmailSender = {
  sendPasswordResetEmail(input: PasswordResetEmail): Promise<void>;
  sendEmailVerificationOtp(input: EmailVerificationOtpEmail): Promise<void>;
};

export const emailSender: EmailSender = {
  async sendPasswordResetEmail(input) {
    if (hasSmtpConfig()) {
      await sendSmtpMail({
        to: input.to,
        subject: "Reset your Manga Shelf password",
        text: buildPasswordResetText(input),
        html: buildPasswordResetHtml(input)
      });
      return;
    }

    if (env.NODE_ENV === "production") {
      console.warn(
        JSON.stringify({
          event: "email.password_reset_not_configured",
          to: input.to,
          expiresAt: input.expiresAt.toISOString()
        })
      );
      return;
    }

    console.info(
      JSON.stringify({
        event: "email.password_reset",
        to: input.to,
        resetUrl: input.resetUrl,
        expiresAt: input.expiresAt.toISOString()
      })
    );
  },
  async sendEmailVerificationOtp(input) {
    if (hasSmtpConfig()) {
      await sendSmtpMail({
        to: input.to,
        subject: "Your Manga Shelf verification code",
        text: buildEmailVerificationText(input),
        html: buildEmailVerificationHtml(input)
      });
      return;
    }

    if (env.NODE_ENV === "production") {
      console.warn(
        JSON.stringify({
          event: "email.verification_not_configured",
          to: input.to,
          expiresAt: input.expiresAt.toISOString()
        })
      );
      return;
    }

    console.info(
      JSON.stringify({
        event: "email.verification",
        to: input.to,
        code: input.code,
        expiresAt: input.expiresAt.toISOString()
      })
    );
  },
};

function hasSmtpConfig() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

async function sendSmtpMail(input: { to: string; subject: string; text: string; html: string }) {
  const from = env.MAIL_FROM ?? env.SMTP_USER;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !from) {
    throw new Error("SMTP is not configured");
  }

  const client = new SmtpClient(env.SMTP_HOST, env.SMTP_PORT);
  await client.connect();
  try {
    await client.command(`EHLO ${env.SMTP_HOST}`, [250]);
    await client.command(`AUTH PLAIN ${Buffer.from(`\0${env.SMTP_USER}\0${env.SMTP_PASS}`).toString("base64")}`, [235]);
    await client.command(`MAIL FROM:<${from}>`, [250]);
    await client.command(`RCPT TO:<${input.to}>`, [250, 251]);
    await client.command("DATA", [354]);
    await client.writeData(formatMessage({ from, to: input.to, subject: input.subject, text: input.text, html: input.html }));
    await client.expect([250]);
    await client.command("QUIT", [221]);
  } finally {
    client.close();
  }
}

function buildPasswordResetText(input: PasswordResetEmail) {
  return [
    `Hi ${input.displayName},`,
    "",
    "Use this link to reset your Manga Shelf password:",
    input.resetUrl,
    "",
    `This link expires at ${input.expiresAt.toISOString()}.`,
    "If you did not request this, you can ignore this email."
  ].join("\n");
}

function buildPasswordResetHtml(input: PasswordResetEmail) {
  const resetUrl = escapeHtml(input.resetUrl);
  return [
    `<p>Hi ${escapeHtml(input.displayName)},</p>`,
    "<p>Use this link to reset your Manga Shelf password:</p>",
    `<p><a href="${resetUrl}">Reset password</a></p>`,
    `<p>This link expires at ${escapeHtml(input.expiresAt.toISOString())}.</p>`,
    "<p>If you did not request this, you can ignore this email.</p>"
  ].join("");
}

function buildEmailVerificationText(input: EmailVerificationOtpEmail) {
  return [
    `Hi ${input.displayName},`,
    "",
    "Use this code to verify your Manga Shelf account:",
    input.code,
    "",
    `This code expires at ${input.expiresAt.toISOString()}.`,
    "If you did not create this account, you can ignore this email."
  ].join("\n");
}

function buildEmailVerificationHtml(input: EmailVerificationOtpEmail) {
  return [
    `<p>Hi ${escapeHtml(input.displayName)},</p>`,
    "<p>Use this code to verify your Manga Shelf account:</p>",
    `<p style="font-size:24px;font-weight:700;letter-spacing:4px">${escapeHtml(input.code)}</p>`,
    `<p>This code expires at ${escapeHtml(input.expiresAt.toISOString())}.</p>`,
    "<p>If you did not create this account, you can ignore this email.</p>"
  ].join("");
}

function formatMessage(input: { from: string; to: string; subject: string; text: string; html: string }) {
  const boundary = `manga-${Date.now().toString(36)}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ];
  return [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html,
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

class SmtpClient {
  private socket?: tls.TLSSocket;
  private buffer = "";

  constructor(
    private readonly host: string,
    private readonly port: number
  ) {}

  async connect() {
    this.socket = tls.connect({ host: this.host, port: this.port, servername: this.host });
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });
    await new Promise<void>((resolve, reject) => {
      this.socket?.once("secureConnect", resolve);
      this.socket?.once("error", reject);
    });
    await this.expect([220]);
  }

  async command(command: string, expectedCodes: number[]) {
    this.write(`${command}\r\n`);
    return this.expect(expectedCodes);
  }

  async writeData(message: string) {
    this.write(`${dotStuff(message)}\r\n.\r\n`);
  }

  async expect(expectedCodes: number[]) {
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP command failed with ${response.code}: ${response.message}`);
    }
    return response;
  }

  close() {
    this.socket?.end();
  }

  private write(data: string) {
    if (!this.socket) throw new Error("SMTP socket is not connected");
    this.socket.write(data);
  }

  private async readResponse() {
    while (true) {
      const parsed = parseSmtpResponse(this.buffer);
      if (parsed) {
        this.buffer = this.buffer.slice(parsed.consumed);
        return parsed.response;
      }
      await new Promise<void>((resolve, reject) => {
        this.socket?.once("data", () => resolve());
        this.socket?.once("error", reject);
      });
    }
  }
}

function parseSmtpResponse(buffer: string) {
  const lines = buffer.split(/\r?\n/);
  let consumed = 0;
  for (const line of lines) {
    if (!line) break;
    consumed += line.length + (buffer.slice(consumed + line.length, consumed + line.length + 2) === "\r\n" ? 2 : 1);
    const match = line.match(/^(\d{3})([ -])(.*)$/);
    if (!match) continue;
    if (match[2] === " ") {
      return { consumed, response: { code: Number(match[1]), message: line } };
    }
  }
  return null;
}

function dotStuff(message: string) {
  return message.replace(/(^|\r?\n)\./g, "$1..");
}
