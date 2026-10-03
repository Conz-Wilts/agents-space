import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (supabaseConfigured()) await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
