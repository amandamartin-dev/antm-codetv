import type { Metadata } from "next";
import { ClerkProvider, SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "./globals.css";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "CodeTV MVP",
  description: "Linear-style issue tracker MVP",
};

function canUseDevBypass() {
  return (
    process.env.ALLOW_DEV_BYPASS_AUTH === "1" ||
    process.env.NODE_ENV !== "production"
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  let isAuthenticated = !!session.userId;
  let clerkUserId = session.userId;

  if (!isAuthenticated && canUseDevBypass()) {
    const fallbackUserId =
      process.env.DEV_DEFAULT_CLERK_USER_ID ??
      process.env.SEED_ADMIN_CLERK_USER_ID;
    if (fallbackUserId) {
      isAuthenticated = true;
      clerkUserId = fallbackUserId;
    }
  }

  let unreadNotifications = 0;
  if (isAuthenticated && clerkUserId) {
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (user) {
      unreadNotifications = await prisma.notification.count({
        where: { userId: user.id, readAt: null },
      });
    }
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-background text-foreground antialiased">
          <TooltipProvider>
            {isAuthenticated ? (
              <SidebarProvider>
                <AppSidebar unreadNotifications={unreadNotifications} />
                <SidebarInset>{children}</SidebarInset>
              </SidebarProvider>
            ) : (
              <div className="flex min-h-svh items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold">CodeTV</h1>
                  <p className="mt-2 text-muted-foreground">
                    Linear-style issue tracker
                  </p>
                  <SignInButton mode="modal">
                    <button className="mt-4 inline-block rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                      Sign in
                    </button>
                  </SignInButton>
                </div>
              </div>
            )}
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
