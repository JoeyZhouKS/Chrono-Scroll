"use client";

import clsx from "clsx";
import { useState } from "react";
import { ClipboardCheck, Plus, Shield } from "lucide-react";
import { ChronoScroll } from "@/components/ChronoScroll";
import type { TimelineEvent } from "@/data/timeline";

export function AdminChronoScroll() {
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<TimelineEvent>>({
    type: "event",
    category: "politics",
    rail: "main"
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLogout = () => {
    if (logoutConfirm) {
      void fetch("/api/auth/admin", {
        method: "DELETE",
        credentials: "include"
      }).finally(() => {
        window.location.href = "/admin";
      });
    } else {
      setLogoutConfirm(true);
      setTimeout(() => setLogoutConfirm(false), 3000);
    }
  };

  const handleAddEvent = async () => {
    if (!addForm.id || !addForm.title || addForm.startYear === undefined || !addForm.type || !addForm.category || !addForm.summary) {
      setMessage({ type: "error", text: "请填写所有必填项" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(addForm)
      });
      if (res.ok) {
        setMessage({ type: "success", text: "添加成功" });
        setShowAddForm(false);
        setAddForm({ type: "event", category: "politics", rail: "main" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "添加失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="relative h-screen">
      <div className="absolute left-0 right-0 top-0 z-[100] flex items-center justify-between border-b border-[#b75f4b]/30 bg-[#fff8e9]/95 px-4 py-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium text-[#b75f4b]">
          <Shield className="h-4 w-4" />
          <span>管理模式</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 rounded-md border border-[#5f8d78] bg-[#5f8d78] px-3 py-1.5 text-sm text-white transition hover:bg-[#4f7d68]"
          >
            <Plus className="h-3.5 w-3.5" />
            添加内容
          </button>
          <a
            href="/admin/approval"
            className="flex items-center gap-1 rounded-md border border-[#6b4a00] bg-[#6b4a00] px-3 py-1.5 text-sm text-white transition hover:bg-[#5a3e00]"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            审批管理
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className={
              logoutConfirm
                ? "rounded-md bg-[#b75f4b] px-3 py-1.5 text-sm text-white transition"
                : "rounded-md border border-[#c9ad7d] px-3 py-1.5 text-sm text-[#8d7652] transition hover:bg-[#ead8b8]"
            }
          >
            {logoutConfirm ? "确认退出？" : "退出管理"}
          </button>
        </div>
      </div>
      <div className="pt-10">
        <ChronoScroll isAdmin />
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2f2a22]">添加事件</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d0b384] text-[#684b24] transition hover:bg-[#ead8b8]"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">ID <span className="text-red-500">*</span></label>
                <input
                  value={addForm.id ?? ""}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, id: e.target.value }))}
                  placeholder="例如: china-qin, roman-empire"
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">标题 <span className="text-red-500">*</span></label>
                <input
                  value={addForm.title ?? ""}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">开始年份 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={addForm.startYear ?? ""}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, startYear: Number(e.target.value) }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">结束年份</label>
                  <input
                    type="number"
                    value={addForm.endYear ?? ""}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, endYear: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">类型 <span className="text-red-500">*</span></label>
                <select
                  value={addForm.type ?? "event"}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, type: e.target.value as "event" | "era" }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                >
                  <option value="event">事件</option>
                  <option value="era">朝代</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">分类 <span className="text-red-500">*</span></label>
                <select
                  value={addForm.category ?? ""}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, category: e.target.value as TimelineEvent["category"] }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                >
                  <option value="era">时代</option>
                  <option value="dynasty">朝代</option>
                  <option value="war">战争</option>
                  <option value="politics">政治</option>
                  <option value="culture">文化</option>
                  <option value="technology">科技</option>
                  <option value="revolution">革命</option>
                  <option value="diplomacy">外交</option>
                  <option value="economy">经济</option>
                  <option value="society">社会</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">轨道位置</label>
                <select
                  value={addForm.rail ?? "main"}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, rail: e.target.value as "main" | "global_long" }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                >
                  <option value="main">主线轨道（右侧）</option>
                  <option value="global_long">长期轨道（左侧）</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">简介 <span className="text-red-500">*</span></label>
                <textarea
                  value={addForm.summary ?? ""}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, summary: e.target.value }))}
                  rows={4}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-md border border-[#c9ad7d] px-4 py-2 text-sm text-[#5d4b31] transition hover:bg-[#ead8b8]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddEvent}
                disabled={saving}
                className="rounded-md bg-[#5f8d78] px-4 py-2 text-sm text-white transition hover:bg-[#4f7d68] disabled:opacity-50"
              >
                {saving ? "添加中..." : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={clsx(
            "fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg",
            message.type === "success" ? "bg-[#5f8d78] text-white" : "bg-[#b75f4b] text-white"
          )}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
