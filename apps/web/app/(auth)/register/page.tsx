"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Lock, RefreshCw, CheckCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    axios
      .get(`${API}/api/auth/registration-status`)
      .then((r) => setRegistrationEnabled(r.data.data.enabled))
      .catch(() => setRegistrationEnabled(true));
  }, []);

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
    if (registrationEnabled) fetchCaptcha();
  }, [registrationEnabled, fetchCaptcha]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captchaAnswer.trim()) { setError(t("enterCaptchaCode")); return; }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/api/auth/register`, { ...form, captchaToken, captchaAnswer });
      setSuccess(true);
    } catch (err: unknown) {
      const axErr = axios.isAxiosError(err);
      const msg = axErr ? err.response?.data?.error ?? "Registration failed" : "Registration failed";
      setError(msg);
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  }

  // Loading
  if (registrationEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Registration closed
  if (!registrationEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-gray-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t("registrationClosed")}</h1>
            <p className="text-gray-500 text-sm mb-6">{t("registrationClosedMsg")}</p>
            <Link href="/login" className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
              {t("backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t("accountCreated")}</h1>
            <p className="text-gray-500 text-sm mb-6">{t("accountCreatedMsg")}</p>
            <Link href="/login?registered=1"
              className="inline-block w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors text-center">
              {t("goToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  const fields = [
    { name: "name",         labelKey: "fieldFullName",     type: "text",     placeholderKey: "placeholderYourName" },
    { name: "email",        labelKey: "emailLabel",         type: "email",    placeholderKey: "emailPlaceholder" },
    { name: "password",     labelKey: "passwordLabel",      type: "password", placeholderKey: "placeholderMinChars" },
    { name: "businessName", labelKey: "fieldBusinessName",  type: "text",     placeholderKey: "placeholderBusinessName" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t("createYourAccount")}</h1>
          <p className="text-gray-500 mt-1">{t("startManagingWA")}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t(field.labelKey)}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  required
                  placeholder={t(field.placeholderKey)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            ))}

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
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {loading ? t("creatingAccount") : t("createAccount")}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">{t("signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
