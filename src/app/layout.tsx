import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { UserProvider } from "@/contexts/UserContext";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

export const metadata: Metadata = {
  title: "Billing Control",
  description: "Controle financeiro pessoal e familiar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body suppressHydrationWarning>
        <AuthSessionProvider>
          <MantineProvider>
            <ModalsProvider>
              <UserProvider>
                <Notifications />
                {children}
              </UserProvider>
            </ModalsProvider>
          </MantineProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
