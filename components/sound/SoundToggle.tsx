"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Mixer from "@/components/sound/Mixer";
import { sound } from "@/components/sound";

const ON_KEY = "vijan:sound-on";

export default function SoundToggle() {
  const [on, setOn] = useState(false);
  const [mix, setMix] = useState(false);
  const home = usePathname() === "/";

  useEffect(() => {
    setMix(new URLSearchParams(window.location.search).has("mix"));
  }, []);

  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem(ON_KEY) === "true";
    } catch {}
    if (!saved) return;
    const resume = async () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      if (await sound.enable()) setOn(true);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  useEffect(() => {
    const onVis = () => (document.hidden ? sound.pause() : sound.resume());
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const toggle = async () => {
    if (on) {
      sound.disable();
      setOn(false);
      try {
        localStorage.setItem(ON_KEY, "false");
      } catch {}
    } else if (await sound.enable()) {
      setOn(true);
      try {
        localStorage.setItem(ON_KEY, "true");
      } catch {}
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Sound off" : "Sound on"}
        title={on ? "Sound off" : "Sound on"}
        className={`fixed z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-[#f3ecd6]/25 bg-[#0e1530]/70 text-[#f3ecd6] ${
          home ? "right-5 top-4 sm:right-8 sm:top-5" : "bottom-20 left-4"
        } transition-colors hover:border-[#f5c04a] hover:text-[#f5c04a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c04a]`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[17px] w-[17px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {on ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          ) : (
            <path d="m16 9 5 6m0-6-5 6" />
          )}
        </svg>
      </button>
      {mix && on && <Mixer />}
    </>
  );
}
