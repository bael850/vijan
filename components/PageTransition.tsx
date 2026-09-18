"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import NextLink from "next/link";
import { useGraphics } from "@/components/providers/GraphicsProvider";

type Phase = "idle" | "closing" | "waiting" | "opening";

type TransitionContextValue = {
  navigate: (href: string) => void;
  currentPath: string;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

const EASE = [0.76, 0, 0.24, 1] as const;
const CLOSE_DURATION = 0.5;
const OPEN_DURATION = 0.6;
const OPEN_DELAY = 0.08;
const WAIT_FALLBACK_MS = 4000;
// Reduce Motion: curtain tetap ada (biar transisi konten tetap "bersih"),
// tapi tanpa slide penuh layar — cuma fade, durasi jauh lebih pendek.
const REDUCED_DURATION = 0.15;

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { reduceMotion } = useGraphics();
  const [phase, setPhase] = useState<Phase>("idle");
  const pendingHref = useRef<string | null>(null);
  const fromPath = useRef(pathname);

  const navigate = useCallback(
    (href: string) => {
      if (phase !== "idle") return;
      fromPath.current = pathname;
      pendingHref.current = href;
      setPhase("closing");
    },
    [phase, pathname],
  );

  const handleCloseComplete = useCallback(() => {
    if (pendingHref.current) {
      router.push(pendingHref.current);
      pendingHref.current = null;
      setPhase("waiting");
    }
  }, [router]);

  useEffect(() => {
    if (phase !== "waiting") return;
    if (pathname !== fromPath.current) {
      setPhase("opening");
      return;
    }
    const fallback = window.setTimeout(
      () => setPhase("opening"),
      WAIT_FALLBACK_MS,
    );
    return () => window.clearTimeout(fallback);
  }, [pathname, phase]);

  return (
    <TransitionContext.Provider value={{ navigate, currentPath: pathname }}>
      {children}

      {phase !== "idle" && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
          animate={
            reduceMotion
              ? { opacity: phase === "opening" ? 0 : 1 }
              : { y: phase === "opening" ? "-100%" : "0%" }
          }
          transition={
            reduceMotion
              ? { duration: REDUCED_DURATION }
              : phase === "opening"
                ? { duration: OPEN_DURATION, delay: OPEN_DELAY, ease: EASE }
                : { duration: CLOSE_DURATION, ease: EASE }
          }
          onAnimationComplete={() => {
            if (phase === "closing") handleCloseComplete();
            if (phase === "opening") setPhase("idle");
          }}
          className="fixed inset-0 z-[70] bg-[#05070d] pointer-events-none flex items-center justify-center"
        >
          <motion.span
            animate={{ opacity: phase === "opening" ? 0 : 0.5 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] uppercase tracking-[0.3em] text-neutral-500"
          >
            Vijan
          </motion.span>
        </motion.div>
      )}
    </TransitionContext.Provider>
  );
}

export function useTransitionRouter() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error(
      "useTransitionRouter harus dipakai di dalam <PageTransitionProvider>",
    );
  }
  return ctx;
}

export function TransitionLink({
  href,
  onClick,
  ...rest
}: ComponentProps<typeof NextLink>) {
  const { navigate, currentPath } = useTransitionRouter();

  return (
    <NextLink
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          href.toString() === currentPath
        ) {
          return;
        }
        e.preventDefault();
        navigate(href.toString());
      }}
      {...rest}
    />
  );
}
