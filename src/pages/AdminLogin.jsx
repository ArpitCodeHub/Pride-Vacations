import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminLogin() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/admin");
    };
    checkSession();

    // Handle OAuth redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin`,
      }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    }
  };

  return (
    <main className="min-h-screen dark-section flex items-center justify-center px-6 text-cream">
      <div
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
        
        {error && (
          <p data-testid="admin-login-error" className="text-red-300 text-sm mb-6">
            {error}
          </p>
        )}

        <button
          data-testid="admin-login-google"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full py-4 bg-white text-ink text-sm font-medium flex items-center justify-center gap-3 hover:bg-cream disabled:opacity-50 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <p className="text-xs text-cream/40 mt-6 text-center leading-relaxed">
          Only authorized team members can access the studio. Sign in with your Zenura Tech Google account.
        </p>
      </div>
    </main>
  );
}
