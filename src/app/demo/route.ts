import { AuthError } from "next-auth";
import { NextResponse } from "next/server";
import { signIn } from "@/server/auth/auth";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    await signIn("credentials", {
      email: "viewer@relay.local",
      password: "password123",
      redirectTo: "/w/demo/inbox",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.redirect(new URL("/login?demo=unavailable", origin));
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/w/demo/inbox", origin));
}
