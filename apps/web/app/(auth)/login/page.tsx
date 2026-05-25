"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { useT } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL;

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer("");
    try {
      const r = await axios.get(`${API}/api/auth/captcha`);
      setCaptchaToken(r.data.data.token);
      setCaptchaImage(r.data.data.image);
    } catch {
      // ignore
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaAnswer.trim()) {
      setError(t("enterSecurityCode"));
      return;
    }
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      captchaToken,
      captchaAnswer,
      redirect: false,
    });

    if (result?.error) {
      setError(t("invalidCredentials"));
      fetchCaptcha();
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {justRegistered && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            {t("accountCreatedSuccess")}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("emailLabel")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder={t("emailPlaceholder")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("passwordLabel")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder={t("passwordPlaceholder")}
          />
        </div>

        {/* CAPTCHA */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("securityCodeLabel")}</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              {captchaLoading ? (
                <div className="w-[200px] h-[70px] bg-gray-100 rounded flex items-center justify-center">
                  <RefreshCw size={18} className="text-gray-400 animate-spin" />
                </div>
              ) : captchaImage ? (
                <img src={captchaImage} alt="Security code" width={200} height={70}
                  className="rounded border border-gray-200 select-none" draggable={false} />
              ) : null}
              <button type="button" onClick={fetchCaptcha} disabled={captchaLoading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors disabled:opacity-40"
                title="Refresh captcha">
                <RefreshCw size={14} className={captchaLoading ? "animate-spin" : ""} />
                {t("newCode")}
              </button>
            </div>
            <input
              type="text"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
              placeholder={t("typeCodeAbove")}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm tracking-widest font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !captchaImage}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("signingIn") : t("signIn")}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">{t("createOne")}</Link>
      </p>
    </div>
  );
}

function LoginPageHeader() {
  const t = useT();
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">{t("whatsappSaas")}</h1>
      <p className="text-gray-500 mt-1">{t("signInToAccount")}</p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.66 0-3.22-.44-4.57-1.2l-.33-.19-3.37.94.94-3.37-.19-.33A8 8 0 1112 20z"/>
              <path d="M8.53 7.87c-.17-.43-.35-.44-.51-.44-.13 0-.28 0-.43.01-.15.01-.38.06-.58.27-.2.22-.76.74-.76 1.8s.78 2.09.89 2.23c.11.15 1.5 2.4 3.7 3.27 1.83.72 2.2.58 2.6.54.4-.04 1.28-.52 1.46-1.03.18-.5.18-.94.13-1.03-.05-.1-.2-.15-.43-.27-.22-.11-1.3-.64-1.5-.71-.2-.08-.34-.11-.48.11-.14.23-.55.71-.67.85-.12.15-.25.17-.46.06-.22-.11-.92-.34-1.76-1.08-.65-.58-1.09-1.3-1.22-1.52-.12-.22-.01-.34.1-.45.1-.1.22-.25.33-.38.11-.12.14-.21.22-.35.07-.14.04-.27-.02-.38-.06-.11-.48-1.17-.66-1.6z"/>
            </svg>
          </div>
          <LoginPageHeader />
        </div>

        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
