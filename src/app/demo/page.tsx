import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/server/auth/auth";

export default async function DemoPage() {
  try {
    await signIn("credentials", {
      email: "viewer@relay.local",
      password: "password123",
      redirectTo: "/w/demo/inbox",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?demo=unavailable");
    }
    throw error;
  }

  redirect("/w/demo/inbox");
}
