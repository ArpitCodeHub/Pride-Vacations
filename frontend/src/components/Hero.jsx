import React, { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    // ensure video tries to autoplay on mount
    const v = document.getElementById("hero-video");
    if (v) v.play().catch(() => {});
  }, []);

  return (
    <section
      ref={ref}
      data-testid="hero-section"
      className="relative h-screen-dyn w-full overflow-hidden bg-ink text-cream"
    >
      <motion.div style={{ y }} className="absolute inset-0">
        <video
          id="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="https://images.unsplash.com/photo-1759344351308-42c4d0e8ec17?crop=entropy&cs=srgb&fm=jpg&q=90&w=2400"
          className="absolute inset-0 w-full h-full object-cover scale-110"
        >
          <source src="/4k_forest.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/80" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-20 md:pb-24 pt-24"
      >
        <motion.span
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          data-testid="hero-overline"
          className="text-xs md:text-sm uppercase tracking-[0.4em] opacity-80 mb-6"
        >
          Curated luxury escapes · est. 2018
        </motion.span>

        <h1 className="font-display leading-[0.95] max-w-5xl text-[clamp(2.5rem,8.5vw,7.5rem)]">
          <motion.span
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="block"
            data-testid="hero-title-line-1"
          >
            You don&rsquo;t book
          </motion.span>
          <motion.span
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="block italic"
            data-testid="hero-title-line-2"
          >
            a hotel.
          </motion.span>
          <motion.span
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.7 }}
            className="block text-gold"
            data-testid="hero-title-line-3"
          >
            You begin a story.
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
        >
          <p className="max-w-md text-base md:text-lg opacity-80 font-light leading-relaxed">
            Pride Vacations is an atelier of cinematic travel — curating moments
            you will retell for years across India&rsquo;s most extraordinary places.
          </p>
          <a
            href="#experiences"
            data-testid="hero-scroll-cta"
            className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] border-b border-white/40 hover:border-white pb-1 self-start md:self-end"
          >
            Discover the journeys
            <span className="text-gold">↓</span>
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-white/50">
        <span className="text-[10px] uppercase tracking-[0.5em] mb-3">Scroll</span>
        <div className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent animate-scroll-hint" />
      </div>
    </section>
  );
}
