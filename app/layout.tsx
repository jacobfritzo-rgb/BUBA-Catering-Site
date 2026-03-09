import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUBA Catering — Fresh Bureka Catering NYC",
  description: "Fresh bureka catering for your NYC event. Party Box from $225. 500+ events catered since 2010. Order online for pickup or delivery.",
  icons: { icon: '/Favicon.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
