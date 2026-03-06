import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import Nodemailer from "next-auth/providers/nodemailer";
import { db } from "./db";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
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
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions as any,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
    Nodemailer({
      server: {
        host: "email-smtp.us-east-1.amazonaws.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.SES_SMTP_USER!,
          pass: process.env.SES_SMTP_PASS!,
        },
      },
      from: "Diverge <noreply@zaen.me>",
    }),
  ],
  session: {
    strategy: "database",  // Required for email magic links (verification tokens)
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id!;
        // Fetch tier and apiKey from DB
        const dbUser = await db.query.users.findFirst({
          where: eq(schema.users.id, user.id!),
          columns: { tier: true, apiKey: true },
        });
        session.user.tier = dbUser?.tier ?? "free";
        session.user.apiKey = dbUser?.apiKey ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
