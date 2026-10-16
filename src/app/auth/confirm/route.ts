import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const supportedTypes: EmailOtpType[] = ["email", "magiclink"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const loginUrl = new URL("/login?message=unavailable", request.url);
  if (!tokenHash || !type || !supportedTypes.includes(type)) return NextResponse.redirect(loginUrl);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(loginUrl);

  const { data: { user } } = await supabase.auth.getUser();
  const allowedEmail = process.env.IPO_RADAR_ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !allowedEmail || user.email.toLowerCase() !== allowedEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?message=check-email", request.url));
  }

  return NextResponse.redirect(new URL("/review", request.url));
}
