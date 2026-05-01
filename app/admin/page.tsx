"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminChronoScroll } from "@/components/AdminChronoScroll";
import { Lock, Shield } from "lucide-react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/admin", { credentials: "include" });
        if (!res.ok) return;

        const data = await res.json();
        if (data.authenticated) {
          setAuthenticated(true);
        } else {
          setIsSetupMode(!data.passwordExists);
        }
      } catch {
        // Ignore network failures and show login form.
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSetupMode) {
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      if (password.length < 6) {
        setError("密码长度至少为6个字符");
        return;
      }

      try {
        const res = await fetch("/api/auth/admin/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setAuthenticated(true);
        } else {
          setError(data.error || "设置密码失败");
        }
      } catch {
        setError("网络错误，请重试");
      }
    } else {
      try {
        const res = await fetch("/api/auth/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setAuthenticated(true);
        } else {
          setError(data.error || "登录失败");
        }
      } catch {
        setError("验证失败，请重试");
      }
    }
  };

  if (loading) return null;

  if (authenticated) {
    return <AdminChronoScroll />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f0df]">
      <div className="w-full max-w-sm rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ead8b8]">
            {isSetupMode ? (
              <Shield className="h-6 w-6 text-[#654920]" />
            ) : (
              <Lock className="h-6 w-6 text-[#654920]" />
            )}
          </div>
        </div>
        <h1 className="mb-2 text-center text-xl font-semibold text-[#2f2a22]">
          {isSetupMode ? "首次设置" : "Admin Console"}
        </h1>
        <p className="mb-6 text-center text-sm text-[#775e3b]">
          {isSetupMode
            ? "请设置管理员密码（至少6个字符）"
            : "Enter the admin password to continue."}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSetupMode ? "设置密码" : "Password"}
            className="mb-4 w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
            autoFocus
          />
          {isSetupMode && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              className="mb-4 w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
            />
          )}
          {error ? (
            <p className="mb-4 text-center text-sm text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-md bg-[#6b4a00] py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a3e00]"
          >
            {isSetupMode ? "设置密码" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
