import NextAuth from "next-auth";
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
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
  trustHost: true,
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
});
