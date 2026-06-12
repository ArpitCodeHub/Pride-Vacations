import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function StoryPage() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const r = await api.get(`/stories/${slug}`);
        if (!cancelled) setStory(r.data);
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
      <div data-testid="story-loading" className="dark-section h-screen flex items-center justify-center text-cream/40 text-xs uppercase tracking-[0.4em]">
        Loading the story…
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div data-testid="story-not-found" className="dark-section h-screen flex flex-col items-center justify-center text-cream text-center px-6">
        <span className="font-display text-6xl mb-4">404</span>
        <p className="text-cream/60 mb-8">This story has not been written yet.</p>
        <Link to="/stories" className="text-xs uppercase tracking-[0.3em] border-b border-cream/40 pb-1">
          ← Back to the journal
        </Link>
      </div>
    );
  }

  return (
    <main data-testid={`story-page-${story.slug}`}>
      <Navbar />
      <article>
        <section className="relative h-[80vh] overflow-hidden dark-section text-cream">
          <img
            src={story.hero_image_url}
            alt={story.title}
            className="absolute inset-0 w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85" />
          <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-16">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4"
            >
              The Journal · {story.read_minutes} min read
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="font-display leading-[1] max-w-4xl text-[clamp(2.5rem,7vw,6rem)]"
            >
              {story.title}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-xs uppercase tracking-[0.3em] text-cream/70 mt-8"
            >
              By {story.author_name}
            </motion.div>
          </div>
        </section>

        <section className="bg-cream text-ink px-6 md:px-12 lg:px-24 py-20 md:py-32">
          <div className="max-w-3xl mx-auto">
            <p className="font-display italic text-2xl md:text-3xl text-ink/85 leading-snug mb-12">
              {story.excerpt}
            </p>
            <div className="prose prose-lg max-w-none">
              {(story.body || "").split("\n").map((para, i) => (
                <p
                  key={i}
                  className="font-display text-xl md:text-[1.45rem] text-ink/85 leading-[1.55] mb-7"
                >
                  {para}
                </p>
              ))}
            </div>

            <div className="mt-20 pt-10 border-t border-ink/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="text-xs uppercase tracking-[0.3em] text-ink/50">
                Written by <span className="text-ink">{story.author_name}</span>
              </div>
              <Link
                to="/stories"
                className="text-xs uppercase tracking-[0.3em] border-b border-ink/40 hover:border-ink pb-0.5"
              >
                ← More from the journal
              </Link>
            </div>
          </div>
        </section>
      </article>
      <Footer />
    </main>
  );
}
