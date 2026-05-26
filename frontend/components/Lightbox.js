"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

export function Lightbox({ imageUrl, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const imgRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === "r") setRotation((r) => r + 90);
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[999] flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white"
              title="Zoom in (+)"
            >
              <ZoomIn size={15} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white"
              title="Zoom out (-)"
            >
              <ZoomOut size={15} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setRotation((r) => r + 90)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white"
              title="Rotate (R)"
            >
              <RotateCcw size={15} />
            </motion.button>
            <span className="ml-2 text-xs text-white/40 tabular-nums font-medium">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white"
            title="Close (Esc)"
          >
            <X size={16} />
          </motion.button>
        </div>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 text-xs text-white/50"
        >
          Scroll to zoom · Drag to pan · R to rotate · Esc to close
        </motion.div>

        {/* Image */}
        <motion.div
          className="relative z-[5] cursor-grab active:cursor-grabbing"
          drag
          dragMomentum={false}
          dragElastic={0.05}
          style={{
            rotate: rotation,
            transition: "rotate 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/60"
              />
            </div>
          )}
          <motion.img
            ref={imgRef}
            src={imageUrl}
            alt="Expanded post image"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: zoom,
              opacity: loading ? 0 : 1,
            }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            onLoad={() => setLoading(false)}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl select-none"
            style={{ willChange: "transform" }}
            draggable={false}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
