import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function StoriesIndex() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await api.get("/stories");
        if (!cancelled) setStories(r.data || []);
      } catch {
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [feature, ...rest] = stories;

  return (
    <main data-testid="stories-index" className="bg-cream text-ink">
      <Navbar />
      {/* Header */}
      <section className="relative dark-section pt-32 pb-16 md:pt-44 md:pb-24 px-6 md:px-12 lg:px-24 overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-[1440px] mx-auto">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            The Journal · From travelers, in their own words
          </span>
          <h1 className="font-display leading-[0.95] max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            A reading room for
            <br />
            <span className="italic text-cream/85">people who travel slowly.</span>
          </h1>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto">
          {loading ? (
            <p data-testid="stories-loading" className="text-ink/40 text-xs uppercase tracking-[0.3em]">
              Loading the journal…
            </p>
          ) : stories.length === 0 ? (
            <p data-testid="stories-empty" className="text-ink/50">
              No stories yet.
            </p>
          ) : (
            <>
              {feature && <FeatureStory story={feature} />}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 mt-20 md:mt-28">
                  {rest.map((s, i) => (
                    <StoryCard key={s.id} story={s} idx={i + 1} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function FeatureStory({ story }) {
  return (
    <motion.article
      data-testid={`story-feature-${story.slug}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-12 gap-6 md:gap-12 items-center"
    >
      <Link
        to={`/stories/${story.slug}`}
        className="col-span-12 md:col-span-7 group overflow-hidden aspect-[5/4]"
      >
        <img
          src={story.hero_image_url}
          alt={story.title}
          className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105"
        />
      </Link>
      <div className="col-span-12 md:col-span-5">
        <span className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4 block">
          Featured · {story.read_minutes} min read
        </span>
        <Link to={`/stories/${story.slug}`}>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.02] mb-6 hover:text-gold transition">
            {story.title}
          </h2>
        </Link>
        <p className="text-ink/70 leading-relaxed max-w-md mb-6">
          {story.excerpt}
        </p>
        <div className="text-xs uppercase tracking-[0.3em] text-ink/50 mb-8">
          By {story.author_name}
        </div>
        <Link
          to={`/stories/${story.slug}`}
          className="inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] border-b border-ink/40 hover:border-ink pb-0.5"
        >
          Read the story <span className="text-gold">→</span>
        </Link>
      </div>
    </motion.article>
  );
}

function StoryCard({ story, idx }) {
  return (
    <motion.article
      data-testid={`story-card-${story.slug}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: idx * 0.1 }}
      className="group"
    >
      <Link to={`/stories/${story.slug}`}>
        <div className="aspect-[4/5] overflow-hidden mb-6">
          <img
            src={story.hero_image_url}
            alt={story.title}
            className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
          />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-ink/40">
          {story.read_minutes} min · {story.author_name}
        </div>
        <h3 className="font-display text-2xl md:text-3xl mt-3 mb-3 leading-tight group-hover:text-gold transition">
          {story.title}
        </h3>
        <p className="text-sm text-ink/60 leading-relaxed">{story.excerpt}</p>
      </Link>
    </motion.article>
  );
}
