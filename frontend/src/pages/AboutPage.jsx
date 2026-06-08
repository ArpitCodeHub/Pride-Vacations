import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const PILLARS = [
  {
    n: "01",
    h: "We sell experiences. Not rooms.",
    p: "Every property we represent is one we have personally stayed in. We choose feelings before we choose features.",
  },
  {
    n: "02",
    h: "We are smaller on purpose.",
    p: "Twelve to twenty escapes. No catalogue. No commission-driven push. Our designers know each property like a close friend.",
  },
  {
    n: "03",
    h: "We respond like humans.",
    p: "When you write to us, a person writes back — usually within hours, often with a question, almost never with a brochure.",
  },
  {
    n: "04",
    h: "Quiet luxury is the only kind.",
    p: "We are not the agency for the loudest sundeck. We are the agency for the deepest exhale.",
  },
];

const TEAM = [
  {
    name: "Mira Khanna",
    role: "Founder, Travel Designer",
    bio: "Spent eleven years in luxury hospitality before deciding she preferred the conversations to the boardrooms.",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?crop=entropy&cs=srgb&fm=jpg&q=90&w=900",
  },
  {
    name: "Rohan Pillai",
    role: "Head of Experience Design",
    bio: "A former chef, now finds himself happiest building dinners no one is expecting in places no one is photographing.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&q=90&w=900",
  },
  {
    name: "Anika Roy",
    role: "Editorial Lead",
    bio: "Writes our journal. Has visited every property in our atlas and remembered something specific about each one.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=srgb&fm=jpg&q=90&w=900",
  },
];

export default function AboutPage() {
  return (
    <main data-testid="about-page" className="bg-cream text-ink">
      <Navbar />

      {/* Hero */}
      <section className="relative dark-section pt-32 pb-20 md:pt-44 md:pb-28 px-6 md:px-12 lg:px-24 overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-end">
          <div className="md:col-span-7">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block"
            >
              About · The Atelier
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15 }}
              className="font-display leading-[0.95] text-[clamp(2.5rem,7vw,6rem)]"
            >
              We are not the world&rsquo;s
              <br />
              <span className="italic text-cream/85">biggest travel agency.</span>
            </motion.h1>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="md:col-span-5"
          >
            <p className="text-cream/80 text-lg leading-relaxed">
              We are an atelier of twelve. We work with a hand-picked atlas of
              boutique properties across India and a quiet handful beyond. We
              build travel that you will remember — and that we would happily
              take ourselves.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-cream py-24 md:py-40 px-6 md:px-12 lg:px-24">
        <div className="max-w-[1440px] mx-auto">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            What we believe
          </span>
          <h2 className="font-display text-4xl md:text-6xl leading-[0.95] mb-20 max-w-3xl">
            Four convictions that shape every itinerary we write.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.n}
                data-testid={`pillar-${p.n}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="border-t border-ink/15 pt-8"
              >
                <span className="font-display text-5xl text-gold leading-none">
                  {p.n}
                </span>
                <h3 className="font-display text-3xl md:text-4xl leading-[1.1] mt-4 mb-4">
                  {p.h}
                </h3>
                <p className="text-ink/70 leading-relaxed max-w-md">{p.p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="dark-section py-24 md:py-40 px-6 md:px-12 lg:px-24 relative overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-[1440px] mx-auto">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            The people who write your trip
          </span>
          <h2 className="font-display text-4xl md:text-6xl leading-[0.95] mb-20 max-w-3xl">
            A small team. <span className="italic text-cream/80">On purpose.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {TEAM.map((m, i) => (
              <motion.div
                key={m.name}
                data-testid={`team-${m.name.split(" ")[0].toLowerCase()}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              >
                <div className="aspect-[4/5] overflow-hidden mb-5">
                  <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">
                  {m.role}
                </div>
                <h3 className="font-display text-2xl mb-3">{m.name}</h3>
                <p className="text-cream/70 text-sm leading-relaxed">{m.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-cream py-24 md:py-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
            One last thing
          </span>
          <h2 className="font-display text-4xl md:text-6xl leading-[0.95] mb-8">
            If any of this sounds like the kind of travel you were quietly looking for &mdash;
          </h2>
          <Link
            to="/contact"
            data-testid="about-contact-cta"
            className="inline-flex items-center gap-3 px-8 py-4 bg-ink text-cream hover:bg-gold hover:text-ink text-xs uppercase tracking-[0.3em] transition"
          >
            Start a conversation <span>→</span>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
