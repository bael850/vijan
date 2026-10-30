"use client";

import { type ComponentProps, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import NextLink from "next/link";

// Versi ringan: curtain transisi dihapus. API-nya dipertahankan supaya
// halaman lama yang masih import TransitionLink tidak error.
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTransitionRouter() {
  const router = useRouter();
  const pathname = usePathname();
  return {
    navigate: (href: string) => router.push(href),
    currentPath: pathname,
  };
}

export function TransitionLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} />;
}
