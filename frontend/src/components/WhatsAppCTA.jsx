import React from "react";

export default function WhatsAppCTA() {
  return (
    <a
      href="https://wa.me/919999999999?text=Hi%20Pride%20Vacations%2C%20I'd%20love%20to%20plan%20a%20journey"
      target="_blank"
      rel="noreferrer"
      data-testid="whatsapp-floating-cta"
      className="fixed bottom-6 left-6 z-[60] flex items-center gap-3 px-4 py-3.5 bg-ink/90 backdrop-blur text-cream rounded-full shadow-2xl hover:bg-gold hover:text-ink transition-all border border-white/10"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>
      <span className="text-xs uppercase tracking-[0.25em] hidden md:inline">WhatsApp us</span>
    </a>
  );
}
