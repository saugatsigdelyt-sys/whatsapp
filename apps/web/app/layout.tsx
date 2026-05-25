import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "WhatsApp SaaS Platform",
  description: "Manage your WhatsApp Business accounts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
