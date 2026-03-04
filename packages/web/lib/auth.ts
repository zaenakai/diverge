import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "./db";
import { Resource } from "sst";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: string;
      apiKey: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: (Resource as any).GoogleClientId?.value || process.env.GOOGLE_CLIENT_ID!,
      clientSecret: (Resource as any).GoogleClientSecret?.value || process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: (Resource as any).GithubClientId?.value || process.env.GITHUB_CLIENT_ID!,
      clientSecret: (Resource as any).GithubClientSecret?.value || process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.tier = (user as Record<string, unknown>).tier ?? "free";
        token.apiKey = (user as Record<string, unknown>).apiKey ?? null;
      }
      // Refresh tier from DB on session update
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tier: true, apiKey: true },
        });
        if (dbUser) {
          token.tier = dbUser.tier;
          token.apiKey = dbUser.apiKey;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = (token.tier as string) ?? "free";
        session.user.apiKey = (token.apiKey as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
