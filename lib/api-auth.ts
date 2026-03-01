import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";

/**
 * Verify the admin_token cookie in an API route handler.
 * Returns null if valid, or a 401 NextResponse if invalid/missing.
 *
 * Usage:
 *   const authError = await requireAdmin(request);
 *   if (authError) return authError;
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
