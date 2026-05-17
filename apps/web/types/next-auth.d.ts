import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    businessId: string;
    businessName: string;
    userRole: string;
    userEmail: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    businessId?: string;
    businessName?: string;
    userRole?: string;
    userEmail?: string;
  }
}
