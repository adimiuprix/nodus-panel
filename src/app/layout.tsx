import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nodus panel",
  description: "Web panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} antialiased`}>
        <div className='min-h-screen bg-base-200'>
          <div className='flex'>
            <main className='flex-1'>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
