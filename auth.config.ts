import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — no Node.js-only imports (no bcrypt, no prisma).
 * Used by middleware. The full auth.ts adds providers + bcrypt on top of this.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/purchases/quick");

      if (!isLoggedIn && !isPublic) return false;
      if (isLoggedIn && pathname === "/login") {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [], // filled in by auth.ts
};
