import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WhatsApp CRM",
  description: "CRM for WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}