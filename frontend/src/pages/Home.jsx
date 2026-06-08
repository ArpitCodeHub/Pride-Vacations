import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SignatureExperiences from "../components/SignatureExperiences";
import TravelStories from "../components/TravelStories";
import Testimonials from "../components/Testimonials";
import InquiryForm from "../components/InquiryForm";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main data-testid="home-page" className="bg-cream text-ink">
      <Navbar />
      <Hero />
      <SignatureExperiences />
      <Testimonials />
      <TravelStories />

      {/* Inquiry / Journey Planning */}
      <section
        id="inquiry"
        data-testid="home-inquiry-section"
        className="relative dark-section py-24 md:py-40 px-6 md:px-12 lg:px-24 overflow-hidden"
      >
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-start">
          <div className="md:col-span-5">
            <span className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block">
              Chapter 04 · Begin the conversation
            </span>
            <h2 className="font-display text-5xl md:text-7xl leading-[0.95] mb-8">
              Tell us how you&rsquo;d like
              <br />
              <span className="italic text-cream/85">to feel.</span>
            </h2>
            <p className="text-cream/70 leading-relaxed max-w-md">
              No catalogues. No package menus. Share a few honest details and
              one of our travel designers will respond &mdash; usually within hours &mdash;
              with thoughtful options shaped around you.
            </p>
          </div>
          <div className="md:col-span-7">
            <InquiryForm />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
