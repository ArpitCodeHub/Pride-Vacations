import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data?.session) navigate("/admin");
  };

  return (
    <main className="min-h-screen dark-section flex items-center justify-center px-6 text-cream">
      <form
        onSubmit={submit}
        data-testid="admin-login-form"
        className="w-full max-w-md border border-cream/15 p-10 md:p-14"
      >
        <Link to="/" className="font-display text-2xl block mb-2">
          Pride <span className="text-gold">Vacations</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold">Admin</span>
        <h1 className="font-display text-4xl mt-4 mb-10 leading-tight">
          Sign in to the studio.
        </h1>
        <label className="block mb-6">
          <span className="text-[11px] uppercase tracking-[0.3em] text-cream/50 mb-2 block">Email</span>
          <input
            data-testid="admin-login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent border-b border-cream/30 focus:border-gold outline-none text-lg font-display py-2"
          />
        </label>
        <label className="block mb-8">
          <span className="text-[11px] uppercase tracking-[0.3em] text-cream/50 mb-2 block">Password</span>
          <input
            data-testid="admin-login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-transparent border-b border-cream/30 focus:border-gold outline-none text-lg font-display py-2"
          />
        </label>
        {error && (
          <p data-testid="admin-login-error" className="text-red-300 text-sm mb-4">
            {error}
          </p>
        )}
        <button
          data-testid="admin-login-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gold text-ink text-xs uppercase tracking-[0.3em] hover:bg-cream disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Enter the studio"}
        </button>
      </form>
    </main>
  );
}
