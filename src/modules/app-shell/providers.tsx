"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { appConfig } from "@/config/app";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={`${appConfig.storageKey}:theme`}
    >
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
