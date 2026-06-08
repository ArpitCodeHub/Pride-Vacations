import React from "react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import InquiryForm from "../components/InquiryForm";

export default function ContactPage() {
  return (
    <main data-testid="contact-page" className="bg-cream text-ink">
      <Navbar />

      <section className="relative dark-section pt-32 pb-24 md:pt-44 md:pb-40 px-6 md:px-12 lg:px-24 overflow-hidden">
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <div className="md:col-span-5">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-xs uppercase tracking-[0.4em] text-gold mb-6 block"
            >
              Get in touch
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15 }}
              className="font-display leading-[0.95] text-[clamp(2.5rem,7vw,5.5rem)]"
            >
              Write to us.
              <br />
              <span className="italic text-cream/85">Or simply say hello.</span>
            </motion.h1>

            <div className="mt-12 space-y-8">
              <ContactRow
                label="WhatsApp"
                value="+91 99999 99999"
                href="https://wa.me/919999999999"
                testid="contact-whatsapp"
              />
              <ContactRow
                label="Email"
                value="concierge@pridevacations.in"
                href="mailto:concierge@pridevacations.in"
                testid="contact-email"
              />
              <ContactRow
                label="Studio"
                value="Bandra West, Mumbai · India"
                testid="contact-studio"
              />
              <ContactRow
                label="Hours"
                value="Mon — Sat · 10am to 7pm IST"
                testid="contact-hours"
              />
            </div>
          </div>

          <div className="md:col-span-7">
            <p className="text-cream/70 leading-relaxed mb-10 max-w-md">
              Tell us a little about the journey you&rsquo;re imagining — even a
              sketch is enough. A real human will write back within hours.
            </p>
            <InquiryForm />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function ContactRow({ label, value, href, testid }) {
  const Content = (
    <div className="border-t border-cream/15 pt-5">
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">{label}</div>
      <div className="font-display text-2xl md:text-3xl text-cream">{value}</div>
    </div>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        data-testid={testid}
        className="block hover:text-gold transition"
      >
        {Content}
      </a>
    );
  }
  return (
    <div data-testid={testid}>{Content}</div>
  );
}
