import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="dark-section py-20 px-6 md:px-12 lg:px-24 border-t border-white/5"
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16">
        <div className="md:col-span-1">
          <div className="font-display text-3xl mb-4">
            Pride<span className="text-gold"> Vacations</span>
          </div>
          <p className="text-cream/60 text-sm leading-relaxed max-w-xs">
            A boutique atelier of cinematic, deeply personal travel &mdash; for those
            who measure life in moments, not miles.
          </p>
        </div>

        <div className="text-sm">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
            Wander
          </div>
          <ul className="space-y-2 text-cream/70">
            <li><Link to="/experiences" className="hover:text-cream">Experiences</Link></li>
            <li><Link to="/stories" className="hover:text-cream">The Journal</Link></li>
            <li><Link to="/about" className="hover:text-cream">About</Link></li>
            <li><Link to="/contact" className="hover:text-cream">Contact</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
            Reach us
          </div>
          <ul className="space-y-2 text-cream/70">
            <li>
              <a href="mailto:concierge@pridevacations.in" className="hover:text-cream">
                concierge@pridevacations.in
              </a>
            </li>
            <li>
              <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="hover:text-cream">
                WhatsApp · +91 99999 99999
              </a>
            </li>
            <li>Mon &mdash; Sat &middot; 10am to 7pm IST</li>
          </ul>
        </div>

        <div className="text-sm">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
            Studio
          </div>
          <ul className="space-y-2 text-cream/70">
            <li>Bandra West, Mumbai</li>
            <li>India</li>
            <li>
              <Link to="/admin/login" data-testid="footer-admin-link" className="hover:text-cream">
                Admin sign-in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-cream/40">
        <span>&copy; Pride Vacations &middot; {new Date().getFullYear()}</span>
        <span>Crafted with intention.</span>
      </div>
    </footer>
  );
}
