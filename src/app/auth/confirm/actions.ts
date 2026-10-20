"use server";

import { createClient, getAdminUser } from "@/lib/supabase/server";

export async function verifyReviewSession() {
  const user = await getAdminUser();
  if (user?.email) return true;

  const supabase = await createClient();
  await supabase.auth.signOut();
  return false;
}
