import React from "react";

export default function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="dark-section py-20 px-6 md:px-12 lg:px-24 border-t border-white/5"
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
        <div>
          <div className="font-display text-3xl mb-4">
            Pride<span className="text-gold"> Vacations</span>
          </div>
          <p className="text-cream/60 text-sm leading-relaxed max-w-xs">
            A boutique atelier of cinematic, deeply personal travel — for those
            who measure life in moments, not miles.
          </p>
        </div>
        <div className="text-sm">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
            Reach us
          </div>
          <ul className="space-y-2 text-cream/70">
            <li>concierge@pridevacations.in</li>
            <li>+91 99999 99999</li>
            <li>Mon — Sat · 10am to 7pm IST</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
            Wander
          </div>
          <ul className="space-y-2 text-cream/70">
            <li><a href="#experiences" className="hover:text-cream">Signature Escapes</a></li>
            <li><a href="#stories" className="hover:text-cream">Travel Stories</a></li>
            <li><a href="#inquiry" className="hover:text-cream">Plan a Journey</a></li>
            <li><a href="/admin/login" data-testid="footer-admin-link" className="hover:text-cream">Admin</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto mt-16 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-cream/40">
        <span>© Pride Vacations · {new Date().getFullYear()}</span>
        <span>Crafted with intention.</span>
      </div>
    </footer>
  );
}
