import React from "react";

const QUOTES = [
  {
    text: "They didn't sell us a vacation. They handed us a memory we didn't know we needed.",
    by: "Vikram & Anaya · Mashobra, 2024",
  },
  {
    text: "Every detail had been thought about by someone who knew us better than we did.",
    by: "Priya R. · Udaipur, 2024",
  },
  {
    text: "I came back lighter. That has never happened from a hotel booking before.",
    by: "Ananya M. · Maldives, 2023",
  },
];

export default function Testimonials() {
  return (
    <section
      data-testid="testimonials-section"
      className="relative bg-cream py-24 md:py-40 px-6 md:px-12 lg:px-24"
    >
      <div className="max-w-[1440px] mx-auto">
        <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
          Chapter 03 · In their words
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20 mt-10">
          {QUOTES.map((q, i) => (
            <figure key={i} data-testid={`testimonial-${i}`} className="border-t border-ink/15 pt-8">
              <span className="font-display text-7xl text-gold leading-none">&ldquo;</span>
              <blockquote className="font-display text-2xl md:text-3xl leading-[1.25] italic text-ink/85 mt-2 mb-8">
                {q.text}
              </blockquote>
              <figcaption className="text-xs uppercase tracking-[0.3em] text-ink/50">
                {q.by}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
