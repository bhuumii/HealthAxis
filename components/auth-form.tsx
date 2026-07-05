"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Mail } from "lucide-react";
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
          <p className="text-xs font-bold uppercase text-[#164e63]">District health operations</p>
          <h1 className="mt-2 text-3xl font-bold text-[#17212b] lg:text-4xl">HealthAxis</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#46515c]">
            Sign in to access stock levels, bed occupancy, staff attendance, and diagnostic readiness across your district&apos;s health centres.
          </p>
          <div className="mt-6 rounded-md border border-[#cfd8df] bg-white p-4 text-sm leading-6 text-[#46515c]">
            <p>
              <span className="font-bold text-slate-950">Who this is for:</span> District health officers and PHC/CHC administrators with an authorized HealthAxis account.
            </p>
            <p className="mt-2">
              <span className="font-bold text-slate-950">Don&apos;t have access?</span> Contact your district health office to request an account.
            </p>
          </div>
        </div>

        <form className="rounded-md border border-[#cfd8df] bg-white p-5" onSubmit={submit}>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-[#17212b]">{isLogin ? "Sign in" : "Create account"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLogin ? "Use your HealthAxis admin account." : "Create a HealthAxis admin account."}
            </p>
          </div>

          {error ? <p className="mb-4 rounded-md bg-[#f8eeee] px-3 py-2 text-sm font-semibold text-[#9f3a38] ring-1 ring-[#d7aaaa]">{error}</p> : null}
          {message ? <p className="mb-4 rounded-md bg-[#eef5f1] px-3 py-2 text-sm font-semibold text-[#47705d] ring-1 ring-[#b8cdbc]">{message}</p> : null}

          <label className="block text-sm font-bold text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfd8df] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
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
            className="mt-2 h-11 w-full rounded-md border border-[#cfd8df] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
            id="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {isLogin ? (
            <button className="mt-3 text-sm font-bold text-[#164e63] hover:text-[#0d3848]" type="button" onClick={forgotPassword} disabled={busy}>
              Forgot password?
            </button>
          ) : null}

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#164e63] px-4 text-sm font-bold text-white hover:bg-[#0d3848] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={busy || loading}
          >
            {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>

          <button
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-[#cfd8df] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={googleSignIn}
            disabled={busy || loading}
          >
            <Mail size={15} strokeWidth={1.75} className="text-[#5c6873]" />
            Continue with Google
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isLogin ? "No account yet?" : "Already have an account?"} {" "}
            <Link className="font-bold text-[#164e63] hover:text-[#0d3848]" href={isLogin ? `/signup?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`}>
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
