import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("Missing ADMIN_PASSWORD or ADMIN_SESSION_SECRET");
  }
  return secret;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  const signature = signPayload(payload, getSessionSecret());

  return {
    token: `${payload}.${signature}`,
    maxAge: SESSION_TTL_SECONDS
  };
}

export function verifyAdminSessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return false;
  if (Math.floor(Date.now() / 1000) >= expiresAt) return false;

  const expectedSignature = signPayload(`${expiresAtRaw}.${nonce}`, getSessionSecret());
  return safeEqual(signature, expectedSignature);
}

export function isAdminAuthenticated(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminSessionToken(token);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "未授权，请先登录" }, { status: 401 });
}
