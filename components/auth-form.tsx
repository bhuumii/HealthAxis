"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/components/language-provider";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.44Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.75-5.6-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98L6.4 13.9Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.93 5.51L6.4 10.1C7.19 7.73 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function authErrorMessage(error: unknown, t: (key: string) => string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return t("authErrorEmailInUse");
    case "auth/invalid-email":
      return t("authErrorInvalidEmail");
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return t("authErrorInvalidCredential");
    case "auth/weak-password":
      return t("authErrorWeakPassword");
    case "auth/user-not-found":
      return t("authErrorUserNotFound");
    case "auth/popup-closed-by-user":
      return t("authErrorPopupClosed");
    case "auth/cancelled-popup-request":
      return t("authErrorPopupCancelled");
    case "auth/unauthorized-domain":
      return t("authErrorUnauthorizedDomain");
    default:
      return t("authErrorDefault");
  }
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next") || "/overview";
  const isLogin = mode === "login";

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, next, router, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password);
      router.replace(next);
    } catch (nextError) {
      setError(authErrorMessage(nextError, t));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.replace(next);
    } catch (nextError) {
      setError(authErrorMessage(nextError, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-86px)] max-w-7xl items-center px-4 py-8 lg:px-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-[#164e63]">{t("authEyebrow")}</p>
          <h1 className="craft-title mt-2">HealthAxis</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#46515c]">
            {t("authLead")}
          </p>
          <div className="mt-6 rounded-md border border-[#cfd8df] bg-white p-4 text-sm leading-6 text-[#46515c]">
            <p>
              <span className="font-bold text-slate-950">{t("authAudienceLabel")}</span> {t("authAudienceText")}
            </p>
            <p className="mt-2">
              <span className="font-bold text-slate-950">{t("authAccessLabel")}</span> {t("authAccessText")}
            </p>
          </div>
        </div>

        <form className="rounded-md border border-[#cfd8df] bg-white p-5" onSubmit={submit}>
          <div className="mb-5">
            <h2 className="craft-section-title">{isLogin ? t("signIn") : t("createAccount")}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLogin ? t("authLoginSubtext") : t("authSignupSubtext")}
            </p>
          </div>

          {error ? <p className="mb-4 rounded-md bg-[#f8eeee] px-3 py-2 text-sm font-semibold text-[#9f3a38] ring-1 ring-[#d7aaaa]">{error}</p> : null}
          <label className="block text-sm font-bold text-slate-700" htmlFor="email">{t("email")}</label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#cfd8df] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="mt-4 block text-sm font-bold text-slate-700" htmlFor="password">{t("password")}</label>
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

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#164e63] px-4 text-sm font-bold text-white hover:bg-[#0d3848] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={busy || loading}
          >
            {busy ? t("pleaseWait") : isLogin ? t("signIn") : t("createAccount")}
          </button>

          <button
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-[#cfd8df] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={googleSignIn}
            disabled={busy || loading}
          >
            <GoogleLogo />{t("continueWithGoogle")}</button>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isLogin ? t("noAccountYet") : t("alreadyHaveAccount")} {" "}
            <Link className="font-bold text-[#164e63] hover:text-[#0d3848]" href={isLogin ? `/signup?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`}>
              {isLogin ? t("signUp") : t("signIn")}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
