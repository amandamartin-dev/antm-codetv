import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeTV MVP",
  description: "Linear-style issue tracker MVP",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-slate-50 text-slate-900 antialiased">
          <div className="fixed right-4 top-4 z-50 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
            {session.userId ? (
              <UserButton />
            ) : (
              <Link
                href="/sign-in"
                className="block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Sign in
              </Link>
            )}
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
