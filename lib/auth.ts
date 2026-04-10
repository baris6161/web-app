import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "nohand_sess";

export function cookieName() {
  return COOKIE_NAME;
}

export async function createSessionToken(username: string): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.SESSION_SECRET || "dev-insecure-change-me"
  );
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || "dev-insecure-change-me"
    );
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function getSessionUsername(
  token: string | undefined
): Promise<string | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || "dev-insecure-change-me"
    );
    const { payload } = await jwtVerify(token, secret);
    const sub = payload?.sub;
    return typeof sub === "string" && sub.trim() ? sub.trim() : null;
  } catch {
    return null;
  }
}
