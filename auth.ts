import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";
import { ensureUserBike } from "@/lib/ownership";

async function ensureBikeForAuthUser(input: {
  id?: string | null;
  email?: string | null;
}) {
  let userId = input.id ?? undefined;

  if (!userId && input.email) {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
      select: {
        id: true,
      },
    });

    userId = user?.id;
  }

  if (!userId) {
    return;
  }

  try {
    await ensureUserBike(userId);
  } catch (error) {
    // Do not block auth if bike bootstrap fails. User can still sign in.
    console.error("Failed to ensure bike for auth user", error);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // Needed for migration from pre-OAuth users that already exist by email.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  logger: {
    error(error) {
      // Stale cookies from the previous database-session strategy fail JWE
      // decryption; the session callback already handles this as "logged out".
      if (error.name === "JWTSessionError") {
        return;
      }
      console.error(error);
    },
  },
  events: {
    async createUser({ user }) {
      await ensureBikeForAuthUser({
        id: user.id,
        email: user.email,
      });
    },
    async signIn({ user }) {
      await ensureBikeForAuthUser({
        id: user.id,
        email: user.email,
      });
    },
  },
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
