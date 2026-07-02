"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Activity, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try signing in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/user-not-found":
      return "No account was found for that email.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/cancelled-popup-request":
      return "Another Google sign-in popup is already open.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Authentication settings.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const next = searchParams.get("next") || "/overview";
  const isLogin = mode === "login";

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, next, router, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password);
      router.replace(next);
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await signInWithGoogle();
      router.replace(next);
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Enter your email first, then use password reset.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-86px)] max-w-7xl items-center px-4 py-8 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-emerald-700">Secure district command centre</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">HealthAxis</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Sign in to monitor PHC/CHC stock, beds, doctors, tests, intervention flags, and live district recommendations.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <Activity className="text-emerald-700" size={22} />
              <p className="mt-3 text-sm font-bold text-slate-950">Real-time district data</p>
              <p className="mt-1 text-sm text-slate-500">Protected operational reads for authenticated users.</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="text-emerald-700" size={22} />
              <p className="mt-3 text-sm font-bold text-slate-950">District admin access</p>
              <p className="mt-1 text-sm text-slate-500">Email/password and Google sign-in supported.</p>
            </div>
          </div>
        </div>

        <form className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" onSubmit={submit}>
          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-950">{isLogin ? "Sign in" : "Create account"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLogin ? "Use your HealthAxis admin account." : "Create a HealthAxis admin account."}
            </p>
          </div>

          {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">{error}</p> : null}
          {message ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{message}</p> : null}

          <label className="block text-sm font-bold text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            id="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {isLogin ? (
            <button className="mt-3 text-sm font-bold text-emerald-700 hover:text-emerald-900" type="button" onClick={forgotPassword} disabled={busy}>
              Forgot password?
            </button>
          ) : null}

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={busy || loading}
          >
            {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>

          <button
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={googleSignIn}
            disabled={busy || loading}
          >
            <Mail size={17} className="text-emerald-700" />
            Continue with Google
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isLogin ? "No account yet?" : "Already have an account?"} {" "}
            <Link className="font-bold text-emerald-700 hover:text-emerald-900" href={isLogin ? `/signup?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`}>
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
