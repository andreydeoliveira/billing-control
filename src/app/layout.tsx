import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { UserProvider } from "@/contexts/UserContext";
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
        <MantineProvider>
          <UserProvider>
            <Notifications />
            {children}
          </UserProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
