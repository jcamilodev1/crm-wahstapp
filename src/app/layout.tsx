import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TolkToc - Tu negocio en tus manos",
  description: "CRM para WhatsApp",
  icons: {
    icon: "/favicon.webp",
    shortcut: "/favicon.webp",
    apple: "/favicon.webp",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body suppressHydrationWarning className="h-full bg-gray-50">
        {children}
      </body>
    </html>
  );
}
