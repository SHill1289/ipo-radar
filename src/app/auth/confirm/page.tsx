"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect } from "react";
import { verifyReviewSession } from "./actions";

const supportedTypes: EmailOtpType[] = ["email", "magiclink"];

export default function ConfirmPage() {
  useEffect(() => {
    let active = true;

    async function completeSignIn() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !publishableKey) {
        window.location.replace("/login?message=setup");
        return;
      }

      const supabase = createBrowserClient(supabaseUrl, publishableKey);
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as EmailOtpType | null;

      if (tokenHash) {
        if (!type || !supportedTypes.includes(type)) {
          window.location.replace("/login?message=unavailable");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          window.location.replace("/login?message=unavailable");
          return;
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        window.location.replace("/login?message=unavailable");
        return;
      }

      window.history.replaceState(null, "", window.location.pathname);
      const allowed = await verifyReviewSession();
      if (!active) return;

      if (!allowed) {
        await supabase.auth.signOut();
        window.location.replace("/login?message=check-email");
        return;
      }

      window.location.replace("/review");
    }

    void completeSignIn().catch(() => {
      if (active) window.location.replace("/login?message=unavailable");
    });

    return () => {
      active = false;
    };
  }, []);

  return <main className="auth-page"><section className="panel auth-card">
    <div className="eyebrow">IPO RADAR · PRIVATE REVIEW</div>
    <h1>Completing sign-in</h1>
    <p role="status">Verifying your secure sign-in link. You’ll be redirected shortly.</p>
  </section></main>;
}
