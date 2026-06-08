import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";

export default function SignatureExperiences() {
  const [experiences, setExperiences] = useState([]);
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

  const featured = experiences.slice(0, 3);

  return (
    <section
      id="experiences"
      data-testid="experiences-section"
      className="relative bg-cream py-24 md:py-40 px-6 md:px-12 lg:px-24"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-20 md:mb-32">
          <div>
            <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
              Chapter 01 &middot; Signature Escapes
            </span>
            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-3xl">
              Stories curated <br />
              <span className="italic">for those who arrive</span>
              <br />
              <span className="text-gold">slowly.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base text-ink/60 leading-relaxed">
            Each escape is hand-built by our travel designers &mdash; beginning not with
            availability, but with the feeling you want to come home with.
          </p>
        </div>

        {loading ? (
          <div data-testid="experiences-loading" className="text-ink/40 text-sm uppercase tracking-[0.3em]">
            Loading the journeys&hellip;
          </div>
        ) : featured.length === 0 ? (
          <SetupEmptyState />
        ) : (
          <>
            <div className="space-y-32 md:space-y-48">
              {featured.map((exp, idx) => (
                <ExperienceRow key={exp.id} exp={exp} idx={idx} />
              ))}
            </div>
            {experiences.length > 3 && (
              <div className="mt-24 md:mt-32 flex justify-center">
                <Link
                  to="/experiences"
                  data-testid="home-experiences-cta"
                  className="inline-flex items-center gap-3 px-8 py-4 border border-ink hover:bg-ink hover:text-cream text-xs uppercase tracking-[0.3em] transition"
                >
                  See all {experiences.length} escapes <span className="text-gold">&rarr;</span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function SetupEmptyState() {
  return (
    <div
      data-testid="experiences-empty"
      className="border border-ink/15 rounded-sm p-10 md:p-16 bg-bone/40 max-w-3xl"
    >
      <span className="text-xs uppercase tracking-[0.3em] text-gold">Setup required</span>
      <h3 className="font-display text-3xl md:text-4xl mt-4 mb-4">
        One last step to bring the journeys alive.
      </h3>
      <ol className="space-y-3 text-sm text-ink/70 list-decimal pl-5">
        <li>
          Open your <strong>Supabase SQL Editor</strong> and paste the schema
          from <code className="bg-ink/5 px-1.5">/app/SUPABASE_SCHEMA.sql</code>.
        </li>
        <li>
          Then visit{" "}
          <code className="bg-ink/5 px-1.5">
            {process.env.REACT_APP_BACKEND_URL}/api/setup/seed
          </code>{" "}
          (POST) to seed sample experiences and your admin account.
        </li>
      </ol>
    </div>
  );
}

function ExperienceRow({ exp, idx }) {
  const isOdd = idx % 2 === 1;
  return (
    <motion.article
      data-testid={`experience-card-${exp.slug}`}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className={`grid grid-cols-12 gap-6 md:gap-12 items-center ${
        isOdd ? "" : ""
      }`}
    >
      <Link
        to={`/experiences/${exp.slug}`}
        data-testid={`experience-image-${exp.slug}`}
        className={`relative overflow-hidden group col-span-12 ${
          isOdd ? "md:col-span-7 md:col-start-6 md:row-start-1" : "md:col-span-7"
        } aspect-[4/5] md:aspect-[5/6]`}
      >
        <img
          src={exp.hero_image_url}
          alt={exp.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-6 left-6 text-white text-xs uppercase tracking-[0.4em]">
          0{idx + 1}
        </span>
      </Link>

      <div
        className={`col-span-12 ${
          isOdd
            ? "md:col-span-4 md:col-start-1 md:row-start-1"
            : "md:col-span-5 md:col-start-8"
        }`}
      >
        <span className="text-xs uppercase tracking-[0.3em] text-ink/50 mb-4 block">
          {exp.location_name}, {exp.country}
        </span>
        <h3 className="font-display text-4xl md:text-5xl leading-[1.05] mb-5">
          {exp.title}
        </h3>
        <p className="text-base text-ink/70 leading-relaxed mb-6 italic font-display">
          {exp.hero_tagline}
        </p>
        <p className="text-sm text-ink/60 leading-relaxed mb-8 max-w-md">
          {exp.story_overview}
        </p>
        <Link
          to={`/experiences/${exp.slug}`}
          data-testid={`experience-cta-${exp.slug}`}
          className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] border-b border-ink/40 hover:border-ink pb-1"
        >
          Enter the experience <span className="text-gold">→</span>
        </Link>
      </div>
    </motion.article>
  );
}
