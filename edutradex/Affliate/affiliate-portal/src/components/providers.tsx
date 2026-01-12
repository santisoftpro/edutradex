"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper
 * Wraps the app with all necessary context providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Re-fetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Re-fetch session when window gains focus
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
