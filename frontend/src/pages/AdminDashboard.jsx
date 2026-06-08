import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

const STATUSES = ["new", "in_review", "proposed", "won", "closed"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null); // selected lead

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        navigate("/admin/login");
        return;
      }
      try {
        const [l, e] = await Promise.all([
          api.get("/admin/leads"),
          api.get("/admin/experiences"),
        ]);
        setLeads(l.data || []);
        setExperiences(e.data || []);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            "Could not load admin data. Make sure setup is complete."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const updateStatus = async (lead, status) => {
    try {
      const r = await api.patch(`/admin/leads/${lead.id}`, { status });
      setLeads((ls) => ls.map((x) => (x.id === lead.id ? r.data : x)));
      if (active?.id === lead.id) setActive(r.data);
    } catch {
      /* ignore */
    }
  };

  return (
    <main data-testid="admin-dashboard" className="min-h-screen bg-cream text-ink">
      <header className="border-b border-ink/10 px-6 md:px-12 py-5 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl">
          Pride <span className="text-gold">Vacations</span>
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-ink/50 hidden md:inline">
            Studio · Admin
          </span>
          <button
            data-testid="admin-signout"
            onClick={signOut}
            className="text-xs uppercase tracking-[0.3em] border-b border-ink/40 pb-0.5 hover:border-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
        <h1 className="font-display text-5xl md:text-6xl mb-2">
          Travelers' briefs
        </h1>
        <p className="text-ink/60 mb-12">
          {loading ? "Loading…" : `${leads.length} inquir${leads.length === 1 ? "y" : "ies"} · ${experiences.length} live experiences`}
        </p>

        {error && (
          <div data-testid="admin-error" className="border border-red-400/30 bg-red-50 text-red-700 p-6 mb-8 text-sm">
            {error}
          </div>
        )}

        {!loading && leads.length === 0 && !error && (
          <div data-testid="admin-empty" className="border border-ink/10 p-10 text-ink/60">
            No inquiries yet. They'll appear here as travelers fill out the form.
          </div>
        )}

        {leads.length > 0 && (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-7 space-y-4">
              {leads.map((l) => (
                <button
                  key={l.id}
                  data-testid={`admin-lead-${l.id}`}
                  onClick={() => setActive(l)}
                  className={`w-full text-left border p-5 hover:border-ink transition ${
                    active?.id === l.id ? "border-ink bg-bone" : "border-ink/15"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-display text-2xl leading-tight">
                        {l.full_name}
                      </div>
                      <div className="text-xs text-ink/50 mt-1">{l.email}</div>
                    </div>
                    <StatusPill status={l.status} />
                  </div>
                  <div className="text-sm text-ink/70 mt-2">
                    {(l.preferred_destinations || []).join(", ") || "—"}
                    {l.travel_companions && (
                      <span className="text-ink/40"> · {l.travel_companions}</span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-ink/40 mt-3">
                    {new Date(l.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </button>
              ))}
            </div>

            <div className="col-span-12 lg:col-span-5">
              {active ? (
                <aside
                  data-testid="admin-lead-detail"
                  className="border border-ink/15 p-6 sticky top-6"
                >
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gold">
                    Brief
                  </span>
                  <h3 className="font-display text-3xl mt-2 mb-1">{active.full_name}</h3>
                  <div className="text-sm text-ink/60 mb-6">
                    {active.email} {active.phone && `· ${active.phone}`}
                  </div>

                  <DetailRow label="Companions" value={active.travel_companions} />
                  <DetailRow label="Occasion" value={active.occasion} />
                  <DetailRow
                    label="Destinations"
                    value={(active.preferred_destinations || []).join(", ")}
                  />
                  <DetailRow label="Budget" value={active.budget_range} />
                  <DetailRow
                    label="Window"
                    value={
                      active.preferred_travel_start
                        ? `${active.preferred_travel_start} → ${active.preferred_travel_end || "open"}`
                        : null
                    }
                  />
                  {active.message && (
                    <div className="mt-6">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-ink/40 mb-2">
                        Their note
                      </div>
                      <p className="font-display italic text-lg text-ink/80 leading-relaxed">
                        {active.message}
                      </p>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-ink/10">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-ink/40 mb-3">
                      Update status
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          data-testid={`admin-status-${s}`}
                          onClick={() => updateStatus(active, s)}
                          className={`text-[10px] uppercase tracking-[0.25em] px-3 py-2 border ${
                            active.status === s
                              ? "bg-ink text-cream border-ink"
                              : "border-ink/20 hover:border-ink/60"
                          }`}
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : (
                <aside className="border border-dashed border-ink/15 p-8 text-ink/40 text-sm text-center">
                  Select a brief to read the full story.
                </aside>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }) {
  const colour =
    status === "new"
      ? "bg-gold/20 text-gold border-gold/40"
      : status === "won"
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : status === "closed"
      ? "bg-ink/5 text-ink/40 border-ink/15"
      : "bg-bone text-ink/70 border-ink/15";
  return (
    <span className={`text-[9px] uppercase tracking-[0.25em] px-2.5 py-1 border ${colour}`}>
      {status?.replace("_", " ") || "—"}
    </span>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-2 border-b border-ink/10 last:border-b-0">
      <div className="text-[10px] uppercase tracking-[0.3em] text-ink/40">{label}</div>
      <div className="text-sm text-ink/80 mt-1">{value}</div>
    </div>
  );
}
