import React, { useState } from "react";
import { api } from "../lib/api";

const STEPS = ["Who is travelling?", "Where to?", "When?", "How shall we reach you?"];

export default function InquiryForm({ experienceId = null, atmosphere = null }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    full_name: "",
    email: "",
    phone: "",
    travel_companions: "",
    preferred_destinations: "",
    budget_range: "",
    preferred_travel_start: "",
    preferred_travel_end: "",
    occasion: "",
    message: "",
  });

  const update = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const canAdvance = () => {
    if (step === 0) return data.full_name && data.travel_companions;
    if (step === 1) return data.preferred_destinations;
    if (step === 2) return data.preferred_travel_start;
    if (step === 3) return data.email;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/leads", {
        experience_id: experienceId,
        ...data,
        preferred_destinations: data.preferred_destinations
          ? data.preferred_destinations.split(",").map((s) => s.trim())
          : null,
      });
      setSuccess(true);
    } catch (e) {
      setError("Something went wrong — please try again or WhatsApp us.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        data-testid="inquiry-success"
        className="border border-cream/20 p-10 md:p-16 text-cream bg-ink/40 backdrop-blur"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-gold">Received</span>
        <h3 className="font-display text-4xl md:text-5xl mt-3 mb-4">
          Your journey has begun.
        </h3>
        <p className="text-cream/70 max-w-md">
          A Pride Vacations travel designer will write to you within the next few
          hours — with options thoughtfully shaped around what you've shared.
        </p>
      </div>
    );
  }

  return (
    <div
      id="inquiry"
      data-testid="inquiry-form"
      className="text-cream"
    >
      <div className="flex items-center justify-between mb-8">
        <span className="text-xs uppercase tracking-[0.3em] text-gold">
          {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </span>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-px w-8 transition-all duration-500 ${
                i <= step ? "bg-gold" : "bg-cream/20"
              }`}
            />
          ))}
        </div>
      </div>

      <h3 className="font-display text-4xl md:text-5xl mb-10 leading-tight">
        {STEPS[step]}
      </h3>

      {step === 0 && (
        <div className="space-y-8">
          <Field
            label="Your name"
            value={data.full_name}
            onChange={(v) => update("full_name", v)}
            testid="inquiry-full-name"
            autoFocus
          />
          <Field
            label="Who's coming with you?"
            placeholder="e.g. Solo, partner, family of 4"
            value={data.travel_companions}
            onChange={(v) => update("travel_companions", v)}
            testid="inquiry-companions"
          />
          <Field
            label="A special occasion?"
            placeholder="Honeymoon, anniversary, a quiet escape…"
            value={data.occasion}
            onChange={(v) => update("occasion", v)}
            testid="inquiry-occasion"
            optional
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <Field
            label="Where do you dream of?"
            placeholder="Maldives, Udaipur, the Himalayas, surprise me…"
            value={data.preferred_destinations}
            onChange={(v) => update("preferred_destinations", v)}
            testid="inquiry-destinations"
            autoFocus
          />
          <Field
            label="Approximate budget per person (optional)"
            placeholder="e.g. ₹2L – ₹4L"
            value={data.budget_range}
            onChange={(v) => update("budget_range", v)}
            testid="inquiry-budget"
            optional
          />
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Field
            label="Travel from"
            type="date"
            value={data.preferred_travel_start}
            onChange={(v) => update("preferred_travel_start", v)}
            testid="inquiry-start-date"
            autoFocus
          />
          <Field
            label="Travel until"
            type="date"
            value={data.preferred_travel_end}
            onChange={(v) => update("preferred_travel_end", v)}
            testid="inquiry-end-date"
            optional
          />
          <div className="md:col-span-2">
            <Field
              label="Anything we should know?"
              placeholder="Dietary needs, accessibility, the kind of evening you love…"
              value={data.message}
              onChange={(v) => update("message", v)}
              testid="inquiry-message"
              multiline
              optional
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          <Field
            label="Email"
            type="email"
            value={data.email}
            onChange={(v) => update("email", v)}
            testid="inquiry-email"
            autoFocus
          />
          <Field
            label="Phone or WhatsApp"
            value={data.phone}
            onChange={(v) => update("phone", v)}
            testid="inquiry-phone"
            optional
          />
        </div>
      )}

      {error && (
        <p data-testid="inquiry-error" className="text-red-300 text-sm mt-6">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between mt-12 pt-8 border-t border-cream/15">
        <button
          type="button"
          data-testid="inquiry-back"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-xs uppercase tracking-[0.3em] opacity-60 hover:opacity-100 disabled:opacity-20"
        >
          ← Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            data-testid="inquiry-next"
            disabled={!canAdvance()}
            onClick={() => setStep((s) => s + 1)}
            className="inline-flex items-center gap-3 px-8 py-3.5 border border-cream/40 hover:border-cream text-xs uppercase tracking-[0.3em] disabled:opacity-30"
          >
            Continue <span className="text-gold">→</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="inquiry-submit"
            disabled={!canAdvance() || submitting}
            onClick={submit}
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-gold text-ink hover:bg-cream text-xs uppercase tracking-[0.3em] disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send my brief"}
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", testid, multiline, optional, autoFocus }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.3em] text-cream/50 mb-3 block">
        {label} {optional && <em className="not-italic text-cream/30">(optional)</em>}
      </span>
      {multiline ? (
        <textarea
          data-testid={testid}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-transparent border-b border-cream/30 focus:border-gold outline-none text-lg md:text-xl font-display py-3 placeholder:text-cream/30 resize-none"
        />
      ) : (
        <input
          data-testid={testid}
          type={type}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-b border-cream/30 focus:border-gold outline-none text-lg md:text-2xl font-display py-3 placeholder:text-cream/30"
        />
      )}
    </label>
  );
}
