import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import InquiryForm from "../components/InquiryForm";
import Footer from "../components/Footer";

export default function ExperiencePage() {
  const { slug } = useParams();
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const r = await api.get(`/experiences/${slug}`);
        if (!cancelled) setExp(r.data);
      } catch (e) {
        if (cancelled) return;
        if (e?.response?.status === 404) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div data-testid="experience-loading" className="dark-section h-screen flex items-center justify-center text-cream/40 text-xs uppercase tracking-[0.4em]">
        Loading the journey…
      </div>
    );
  }

  if (notFound || !exp) {
    return (
      <div data-testid="experience-not-found" className="dark-section h-screen flex flex-col items-center justify-center text-cream text-center px-6">
        <span className="font-display text-6xl mb-4">404</span>
        <p className="text-cream/60 mb-8">This story doesn&rsquo;t exist — yet.</p>
        <Link to="/" className="text-xs uppercase tracking-[0.3em] border-b border-cream/40 pb-1">
          ← Return home
        </Link>
      </div>
    );
  }

  const atmoClass = `atmo-${exp.atmosphere || "mountain"}`;

  return (
    <main data-testid={`experience-page-${exp.slug}`} className={`${atmoClass}`}>
      <Navbar />
      <ChapterHero exp={exp} />
      {(exp.story_chapters || []).map((ch, idx) => (
        <Chapter key={idx} chapter={ch} idx={idx} reverse={idx % 2 === 1} />
      ))}
      <DetailsSection exp={exp} />
      <PlanJourneySection exp={exp} />
      <Footer />
    </main>
  );
}

function ChapterHero({ exp }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <section
      ref={ref}
      data-testid="experience-hero"
      className="relative h-screen-dyn overflow-hidden text-cream"
      style={{ background: "var(--atmo-bg)" }}
    >
      <motion.div style={{ y }} className="absolute inset-0">
        <img
          src={exp.hero_image_url}
          alt={exp.title}
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </motion.div>

      <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-20 pt-24">
        <motion.span
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-xs uppercase tracking-[0.4em] mb-6"
          style={{ color: "var(--atmo-accent)" }}
        >
          {exp.location_name} · {exp.country}
        </motion.span>
        <motion.h1
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.2 }}
          className="font-display leading-[0.95] max-w-5xl text-[clamp(2.5rem,8vw,7rem)]"
        >
          {exp.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-8 max-w-xl font-display italic text-xl md:text-2xl text-cream/80"
        >
          {exp.hero_tagline}
        </motion.p>
      </div>
    </section>
  );
}

function Chapter({ chapter, idx, reverse }) {
  const palette = idx % 2 === 0 ? "bg-cream text-ink" : "dark-section";
  return (
    <section
      data-testid={`chapter-${chapter.number}`}
      className={`${palette} py-24 md:py-40 px-6 md:px-12 lg:px-24 relative overflow-hidden`}
    >
      <div className="absolute top-12 right-6 md:right-24 font-display text-[12rem] md:text-[20rem] leading-none opacity-[0.06] pointer-events-none select-none">
        {chapter.number}
      </div>
      <div className="relative max-w-[1440px] mx-auto grid grid-cols-12 gap-6 md:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className={`col-span-12 ${reverse ? "md:col-span-6 md:col-start-7" : "md:col-span-6"} aspect-[4/5] overflow-hidden`}
        >
          {chapter.image_url && (
            <img
              src={chapter.image_url}
              alt={chapter.title}
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
        <div className={`col-span-12 ${reverse ? "md:col-span-5 md:col-start-1 md:row-start-1" : "md:col-span-5 md:col-start-8"}`}>
          <span className="text-xs uppercase tracking-[0.4em] mb-6 block" style={{ color: "var(--atmo-accent)" }}>
            Chapter {chapter.number}
          </span>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.02] mb-8">
            {chapter.title}
          </h2>
          <p className="text-base md:text-lg leading-relaxed opacity-80 max-w-md">
            {chapter.body}
          </p>
        </div>
      </div>
    </section>
  );
}

function DetailsSection({ exp }) {
  return (
    <section
      data-testid="experience-details"
      className="bg-cream text-ink py-24 md:py-40 px-6 md:px-12 lg:px-24"
    >
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-12 md:gap-20">
        <div className="col-span-12 md:col-span-5">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            The property
          </span>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.95] mb-6">
            {exp.property_name}
          </h2>
          <p className="text-ink/60 leading-relaxed max-w-md mb-8">
            {exp.story_overview}
          </p>
          <dl className="border-t border-ink/15 pt-6 space-y-3 text-sm">
            <Detail label="Region" value={`${exp.region}, ${exp.country}`} />
            <Detail label="Stay length" value={`${exp.duration_nights} nights · curated`} />
            <Detail
              label="Starting from"
              value={`${exp.currency_code} ${Number(
                exp.starting_price
              ).toLocaleString("en-IN")} / journey`}
            />
          </dl>
        </div>
        <div className="col-span-12 md:col-span-7">
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-10">
            {(exp.gallery || []).slice(0, 4).map((g, i) => (
              <div
                key={i}
                className={`overflow-hidden ${i === 0 ? "col-span-2 aspect-[3/2]" : "aspect-[4/5]"}`}
              >
                <img src={g} alt={`${exp.title} ${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-ink/50 mb-4 block">
              Curated for you
            </span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {(exp.amenities || []).map((a, i) => (
                <li
                  key={i}
                  className="font-display text-xl border-b border-ink/10 pb-3 flex items-start gap-3"
                >
                  <span className="text-gold text-base mt-1">+</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2">
      <dt className="text-[10px] uppercase tracking-[0.3em] text-ink/50">{label}</dt>
      <dd className="text-right text-ink font-medium">{value}</dd>
    </div>
  );
}

function PlanJourneySection({ exp }) {
  return (
    <section
      id="inquiry"
      data-testid="experience-inquiry"
      className="relative dark-section py-24 md:py-40 px-6 md:px-12 lg:px-24 overflow-hidden"
    >
      <div className="grain absolute inset-0" />
      <div className="relative z-10 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-start">
        <div className="md:col-span-5">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            Chapter 06 · Plan your journey
          </span>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.95] mb-8">
            Begin your
            <br />
            <span className="italic text-cream/85">{exp.title}.</span>
          </h2>
          <p className="text-cream/70 leading-relaxed">
            Share a few details, and we&rsquo;ll respond within hours with a thoughtful
            proposal — never a price list.
          </p>
        </div>
        <div className="md:col-span-7">
          <InquiryForm experienceId={exp.id} atmosphere={exp.atmosphere} />
        </div>
      </div>
    </section>
  );
}
