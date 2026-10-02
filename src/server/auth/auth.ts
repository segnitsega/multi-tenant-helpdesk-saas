import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { z } from "zod";
import { systemDb } from "@/server/db/system";
import { env } from "@/server/env";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const email = parsed.data.email.trim().toLowerCase();
      const user = await systemDb.orm.public.User.where({ email }).first();
      if (!user?.passwordHash) return null;

      const valid = await verifyPassword(
        user.passwordHash,
        parsed.data.password,
      );
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  }),
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email =
        user.email?.trim().toLowerCase() ??
        (typeof profile?.email === "string"
          ? profile.email.trim().toLowerCase()
          : null);

      if (!email) return false;

      let existing = await systemDb.orm.public.User.where({ email }).first();
      if (!existing) {
        existing = await systemDb.orm.public.User.create({
          email,
          name: user.name ?? null,
          emailVerifiedAt: new Date(),
        });
      } else if (!existing.emailVerifiedAt) {
        await systemDb.orm.public.User.where({ id: existing.id }).update({
          emailVerifiedAt: new Date(),
          name: existing.name ?? user.name ?? null,
        });
      }

      user.id = existing.id;
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.id) {
        token.userId = user.id;
        return token;
      }
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
