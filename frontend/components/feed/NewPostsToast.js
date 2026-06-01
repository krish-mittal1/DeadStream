"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export function NewPostsToast({ count, onLoad }) {
  const label = count >= 99 ? "99+" : count;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          onClick={onLoad}
          className="sticky top-0 z-10 mx-auto -mt-0.5 flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-accent)]/90 to-[var(--color-accent-hover)]/90 backdrop-blur-md py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:brightness-110"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={13} />
          </motion.div>
          {label} new {count === 1 ? "post" : "posts"} - click to load
        </motion.button>
      )}
    </AnimatePresence>
  );
}
