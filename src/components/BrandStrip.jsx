import React from "react";
import { motion } from "framer-motion";

/**
 * Slim editorial divider between the hero and the experiences index.
 * Holds the agency credential line that used to live in the hero overline.
 */
export default function BrandStrip() {
  return (
    <section
      data-testid="brand-strip"
      className="bg-cream text-ink border-y border-ink/10"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24 py-6 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          data-testid="brand-strip-line"
          className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-ink/60"
        >
          Curated luxury escapes
          <span className="hidden md:inline">
            <span className="text-gold mx-3">·</span>
            Est. 2018
            <span className="text-gold mx-3">·</span>
            Mumbai &amp; the world
          </span>
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.15 }}
          className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-ink/40"
        >
          A boutique atelier of 20 hand-picked properties
        </motion.span>
      </div>
    </section>
  );
}
