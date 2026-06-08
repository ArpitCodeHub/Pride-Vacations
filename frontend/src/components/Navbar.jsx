import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { to: "/experiences", label: "Experiences", testid: "nav-experiences" },
  { to: "/stories", label: "Journal", testid: "nav-stories" },
  { to: "/about", label: "About", testid: "nav-about" },
  { to: "/contact", label: "Contact", testid: "nav-contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > (isHome ? window.innerHeight * 0.6 : 30));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <nav
      data-testid="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || !isHome
          ? "backdrop-blur-xl bg-ink/90 border-b border-white/5"
          : "bg-gradient-to-b from-black/40 to-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between text-white">
        <Link to="/" data-testid="nav-logo" className="font-display text-2xl tracking-tight leading-none">
          Pride
          <span className="text-gold"> Vacations</span>
        </Link>

        <div className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.25em]">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={l.testid}
              className={({ isActive }) =>
                `transition ${isActive ? "text-gold" : "opacity-70 hover:opacity-100"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/contact"
            data-testid="nav-begin-cta"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 hover:border-white text-xs uppercase tracking-[0.25em] transition"
          >
            Begin <span className="text-gold">→</span>
          </Link>
        </div>

        <button
          data-testid="nav-mobile-toggle"
          onClick={() => setOpen((o) => !o)}
          className="md:hidden p-2 -mr-2 text-white"
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile sheet */}
      <div
        data-testid="nav-mobile-menu"
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-500 ${
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        } bg-ink/95 backdrop-blur-xl border-t border-white/5`}
      >
        <div className="px-6 py-8 flex flex-col gap-6 text-cream">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`${l.testid}-mobile`}
              className="font-display text-3xl"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/contact"
            data-testid="nav-begin-cta-mobile"
            className="mt-4 inline-flex items-center gap-2 px-5 py-3.5 bg-gold text-ink text-xs uppercase tracking-[0.25em]"
          >
            Begin a journey <span>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
