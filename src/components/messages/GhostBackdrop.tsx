"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Fantasma di sfondo delle chat temporanee: poco visibile, ma si vede che c'è. */
export default function GhostBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
      <motion.svg
        viewBox="0 0 100 120"
        fill="currentColor"
        className="w-52 text-fg opacity-[0.09] sm:w-64"
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          fillRule="evenodd"
          d="M50 6C27 6 10 24 10 48v62l13-10 13 10 14-10 14 10 13-10 13 10V48C90 24 73 6 50 6Z M33 46a6 6 0 1 0 12 0 6 6 0 1 0-12 0Z M55 46a6 6 0 1 0 12 0 6 6 0 1 0-12 0Z M43 66a7 9 0 1 0 14 0 7 9 0 1 0-14 0Z"
        />
      </motion.svg>
    </div>
  );
}
