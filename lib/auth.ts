import { SignJWT, jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  console.error(
    "WARNING: JWT_SECRET env var is not set — using insecure default key. " +
    "Anyone can forge admin tokens. Set JWT_SECRET in your Railway environment variables."
  );
}

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "buba-catering-secret-key-change-in-production"
);

export async function signToken(payload: { username: string }): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);

  return token;
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { username: string };
  } catch (error) {
    return null;
  }
}
