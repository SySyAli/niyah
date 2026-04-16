import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Niyah - Put Your Money Where Your Mind Is",
  description:
    "Focus sessions with real financial stakes. You and your friends stake money, lock distracting apps, and the people who stay focused earn more back.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-light-32x32.png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
