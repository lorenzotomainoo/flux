"use client";

import { motion } from "framer-motion";

// A differenza del layout, il template si rimonta a ogni navigazione:
// perfetto per una transizione d'ingresso fluida tra le pagine.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
