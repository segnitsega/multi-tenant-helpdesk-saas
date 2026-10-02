import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/onboarding", "/w/:path*"],
};
