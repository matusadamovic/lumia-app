import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared glass style used across components */
export const glassClasses =
  "overflow-hidden rounded-[28px] drop-shadow-[-8px_-12px_46px_rgba(0,0,0,0.37)] bg-white/30 dark:bg-zinc-900/30 backdrop-brightness-110 backdrop-blur-[2px] backdrop-[url('#displacementFilter')] drop-shadow-[0_4px_16px_rgba(0,0,0,0.25)] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:content-[''] before:ring-1 before:ring-white/60 before:shadow-[inset_0_0_4px_rgba(255,255,255,0.28)] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:content-[''] after:bg-[radial-gradient(60%_60%_at_0%_0%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.15)_18%,transparent_35%),radial-gradient(60%_60%_at_100%_100%,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.1)_18%,transparent_35%)] after:bg-no-repeat text-white";

export const iconButtonClasses =
  "p-2 text-black flex items-center justify-center";
