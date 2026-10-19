"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const allowedEmail = process.env.IPO_RADAR_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect("/login?message=setup");
  if (!email || !allowedEmail || email !== allowedEmail) redirect("/login?message=sent");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/confirm`,
    },
  });

  if (error) redirect("/login?message=unavailable");
  redirect("/login?message=sent");
}
