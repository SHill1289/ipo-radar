import { redirect } from "next/navigation";
import Link from "next/link";
import { requestMagicLink } from "./actions";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const user = await getAdminUser();
  if (user) redirect("/review");
  const { message } = await searchParams;

  return <main className="auth-page"><section className="panel auth-card">
    <div className="eyebrow">IPO RADAR · PRIVATE REVIEW</div>
    <h1>Sign in to review IPO details</h1>
    <p>Only the configured reviewer can access this workspace. We’ll email you a secure sign-in link.</p>
    {message === "sent" ? <div className="auth-message" role="status">If the configured reviewer account is active, a sign-in link is on its way.</div> : null}
    {message === "setup" ? <div className="auth-message" role="alert">Private review sign-in still needs its Supabase and reviewer environment settings.</div> : null}
    {message === "check-email" ? <div className="auth-message" role="status">This account is not permitted to use the private review area.</div> : null}
    {message === "unavailable" ? <div className="auth-message" role="alert">Sign-in is temporarily unavailable. Check the Supabase Auth configuration.</div> : null}
    <form action={requestMagicLink} className="review-form">
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <button className="button button-primary" type="submit">Email me a sign-in link</button>
    </form>
    <Link className="text-link auth-back" href="/">Back to IPO Radar</Link>
  </section></main>;
}
