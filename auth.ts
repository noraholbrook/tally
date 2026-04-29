import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

function normalizeHandle(raw: string) {
  return raw.trim().startsWith("@") ? raw.trim() : `@${raw.trim()}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        venmoHandle: { label: "Venmo Handle", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.venmoHandle || !credentials?.password) return null;
        const handle = normalizeHandle(credentials.venmoHandle as string);
        const user = await prisma.user.findFirst({ where: { venmoHandle: handle } });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email ?? handle };
      },
    }),
  ],
});
