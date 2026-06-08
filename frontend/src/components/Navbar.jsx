import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar({ theme = "dark" }) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      data-testid="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl bg-ink/90 border-b border-white/5"
          : "bg-gradient-to-b from-black/40 to-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between text-white">
        <Link
          to="/"
          data-testid="nav-logo"
          className="font-display text-2xl tracking-tight leading-none"
        >
          Pride
          <span className="text-gold"> Vacations</span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.25em]">
          <a href="/#experiences" data-testid="nav-experiences" className="opacity-70 hover:opacity-100 transition">
            Experiences
          </a>
          <a href="/#stories" data-testid="nav-stories" className="opacity-70 hover:opacity-100 transition">
            Stories
          </a>
          <a href="/#inquiry" data-testid="nav-plan-journey" className="opacity-70 hover:opacity-100 transition">
            Plan a Journey
          </a>
        </div>
        <a
          href="/#inquiry"
          data-testid="nav-begin-cta"
          className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 hover:border-white text-xs uppercase tracking-[0.25em] transition"
        >
          Begin <span className="text-gold">→</span>
        </a>
      </div>
    </nav>
  );
}
