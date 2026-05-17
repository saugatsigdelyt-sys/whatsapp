import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
            {
              email: credentials.email,
              password: credentials.password,
            }
          );

          if (data.success) {
            return {
              id: data.data.user.id,
              email: data.data.user.email,
              name: data.data.user.name,
              // Store these in token for later use
              accessToken: data.data.token,
              businessId: data.data.business?.id,
              businessName: data.data.business?.name,
              userRole: data.data.user.role,
              userEmail: data.data.user.email,
            };
          }
          return null;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.businessId = (user as any).businessId;
        token.businessName = (user as any).businessName;
        token.userRole = (user as any).userRole;
        token.userEmail = (user as any).userEmail;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.businessId = token.businessId as string;
      session.businessName = token.businessName as string;
      session.userRole = token.userRole as string;
      session.userEmail = token.userEmail as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});

export { handler as GET, handler as POST };
