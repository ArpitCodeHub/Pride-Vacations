import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";

export default function TravelStories() {
  const [stories, setStories] = useState([]);
  useEffect(() => {
    api.get("/stories").then((r) => setStories(r.data || [])).catch(() => {});
  }, []);

  if (stories.length === 0) return null;

  return (
    <section
      id="stories"
      data-testid="stories-section"
      className="relative dark-section py-24 md:py-40 px-6 md:px-12 lg:px-24 overflow-hidden"
    >
      <div className="grain absolute inset-0" />
      <div className="relative z-10 max-w-[1440px] mx-auto">
        <div className="mb-20 md:mb-28">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            Chapter 02 · From the Journal
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-4xl">
            Travel stories told by
            <br />
            <span className="italic text-cream/80">those who lived them.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {stories.slice(0, 3).map((s, idx) => (
            <motion.article
              key={s.id}
              data-testid={`story-card-${s.slug}`}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: idx * 0.15 }}
              className="group cursor-pointer"
            >
              <div className="aspect-[4/5] overflow-hidden mb-6">
                <img
                  src={s.hero_image_url}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105"
                />
              </div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-cream/40">
                {s.read_minutes} min read · {s.author_name}
              </span>
              <h3 className="font-display text-3xl mt-3 mb-3 leading-tight group-hover:text-gold transition">
                {s.title}
              </h3>
              <p className="text-sm text-cream/60 leading-relaxed">{s.excerpt}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
