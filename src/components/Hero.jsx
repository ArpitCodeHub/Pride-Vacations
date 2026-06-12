import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Hero() {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => setVideoReady(true);
    if (v.readyState >= 3) setVideoReady(true);
    v.addEventListener("playing", onReady);
    v.addEventListener("canplaythrough", onReady);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener("playing", onReady);
      v.removeEventListener("canplaythrough", onReady);
    };
  }, []);

  return (
    <section
      ref={ref}
      data-testid="hero-section"
      className="relative h-screen-dyn w-full overflow-hidden bg-ink text-cream"
    >
      <motion.div style={{ y }} className="absolute inset-0">
        <video
          ref={videoRef}
          id="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/4k_forest.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/80" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-20 md:pb-24 pt-24"
      >
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
