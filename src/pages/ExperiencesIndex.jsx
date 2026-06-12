import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const FILTERS = [
  { key: "all", label: "Every escape" },
  { key: "mountain", label: "Mountain" },
  { key: "beach", label: "Beach & islands" },
  { key: "heritage", label: "Heritage" },
  { key: "forest", label: "Forest & wellness" },
];

export default function ExperiencesIndex() {
  const [experiences, setExperiences] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await api.get("/experiences");
        if (!cancelled) setExperiences(r.data || []);
      } catch {
        if (!cancelled) setExperiences([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return experiences;
    return experiences.filter((e) => e.atmosphere === filter);
  }, [experiences, filter]);

  return (
    <main data-testid="experiences-index" className="bg-cream text-ink">
      <Navbar />
      {/* Header */}
      <section className="relative dark-section pt-32 pb-20 md:pt-44 md:pb-28 px-6 md:px-12 lg:px-24 overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-[1440px] mx-auto">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block"
          >
            The Atlas · Curated Experiences
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
            className="font-display leading-[0.95] max-w-5xl text-[clamp(2.5rem,7vw,6rem)]"
          >
            Twelve quiet places.
            <br />
            <span className="italic text-cream/85">Each one is a feeling.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="max-w-xl text-cream/70 mt-8 leading-relaxed"
          >
            Hand-picked. Personally walked. Whispered about. These are the
            escapes our travel designers reach for when someone asks for
            somewhere a little out of the ordinary.
          </motion.p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="sticky top-[68px] z-40 bg-cream/95 backdrop-blur border-y border-ink/10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-24 py-4 flex flex-wrap gap-2 md:gap-3 items-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-ink/40 mr-2">
            Filter ·
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              data-testid={`filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] md:text-xs uppercase tracking-[0.25em] px-4 py-2 border transition ${
                filter === f.key
                  ? "bg-ink text-cream border-ink"
                  : "border-ink/20 hover:border-ink/60"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] uppercase tracking-[0.3em] text-ink/40">
            {filtered.length} escape{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto">
          {loading ? (
            <p data-testid="experiences-index-loading" className="text-ink/40 text-xs uppercase tracking-[0.3em]">
              Loading the atlas…
            </p>
          ) : filtered.length === 0 ? (
            <p data-testid="experiences-index-empty" className="text-ink/50">
              No escapes in this style yet. Try another atmosphere.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
              {filtered.map((exp, idx) => (
                <ExperienceCard key={exp.id} exp={exp} idx={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ExperienceCard({ exp, idx }) {
  return (
    <motion.article
      data-testid={`atlas-card-${exp.slug}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/experiences/${exp.slug}`} className="group block">
        <div className="relative aspect-[5/6] overflow-hidden">
          <img
            src={exp.hero_image_url}
            alt={exp.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute top-5 left-5 text-white/90 text-[10px] uppercase tracking-[0.4em]">
            {String(idx + 1).padStart(2, "0")} · {exp.atmosphere}
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 text-white">
            <h3 className="font-display text-3xl md:text-4xl leading-[1.05]">
              {exp.title}
            </h3>
            <p className="text-xs uppercase tracking-[0.3em] opacity-80 mt-3">
              {exp.location_name} · {exp.country}
            </p>
          </div>
        </div>
        <div className="pt-5">
          <p className="font-display italic text-lg text-ink/80 max-w-md">
            {exp.hero_tagline}
          </p>
          <span className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] mt-4 border-b border-ink/30 group-hover:border-ink pb-0.5">
            Enter the experience <span className="text-gold">→</span>
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
