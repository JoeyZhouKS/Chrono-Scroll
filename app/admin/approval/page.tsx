"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Clock, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

type PendingEvent = {
  id: string;
  title: string;
  startYear: number;
  endYear?: number;
  type: "event" | "era";
  category: string;
  summary: string;
  appliedAt: string;
  email?: string;
  rail?: string;
};

type RejectionLog = {
  id: string;
  title: string;
  rejectedAt: string;
  reason: string;
};

type ApproveFormState = Partial<PendingEvent>;

const CATEGORY_LABELS: Record<string, string> = {
  era: "时代",
  dynasty: "朝代",
  war: "战争",
  politics: "政治",
  culture: "文化",
  technology: "科技",
  revolution: "革命",
  diplomacy: "外交",
  economy: "经济",
  society: "社会"
};

const TYPE_LABELS: Record<PendingEvent["type"], string> = {
  event: "事件",
  era: "朝代"
};

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : `${year}`;
}

function formatRange(event: PendingEvent): string {
  const endYear = event.endYear ?? event.startYear;
  return endYear === event.startYear
    ? formatYear(event.startYear)
    : `${formatYear(event.startYear)} - ${formatYear(endYear)}`;
}

export default function ApprovalPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingEvent[]>([]);
  const [rejections, setRejections] = useState<RejectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<"pending" | "rejected">("pending");
  const [selected, setSelected] = useState<PendingEvent | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [approveEvent, setApproveEvent] = useState<PendingEvent | null>(null);
  const [approveForm, setApproveForm] = useState<ApproveFormState>({});
  const [savingApprove, setSavingApprove] = useState(false);
  const [clearingRejections, setClearingRejections] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/pending-events", { credentials: "include" });
    if (!res.ok) {
      throw new Error("Failed to fetch pending data");
    }

    const data = await res.json();
    setPending(Array.isArray(data.pending) ? data.pending : []);
    setRejections(Array.isArray(data.rejections) ? data.rejections : []);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch("/api/auth/admin", { credentials: "include" });
        if (!authRes.ok) {
          router.replace("/admin");
          return;
        }

        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.replace("/admin");
          return;
        }

        setAuthorized(true);
        await fetchData();
      } catch {
        router.replace("/admin");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchData, router]);

  const openApproveForm = (event: PendingEvent) => {
    setApproveEvent(event);
    setApproveForm({
      id: event.id,
      title: event.title,
      startYear: event.startYear,
      endYear: event.endYear,
      type: event.type,
      category: event.category,
      rail: event.rail ?? "main",
      summary: event.summary
    });
  };

  const handleConfirmApprove = async () => {
    if (!approveEvent || !approveForm.id || !approveForm.title || approveForm.startYear === undefined || !approveForm.type || !approveForm.category || !approveForm.summary) {
      setMessage({ type: "error", text: "请填写所有必填项" });
      return;
    }
    setSavingApprove(true);
    try {
      const res = await fetch("/api/pending-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "approve", id: approveEvent.id, event: approveForm })
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "审批失败" });
        return;
      }

      setPending((prev) => prev.filter((item) => item.id !== approveEvent.id));
      setApproveEvent(null);
      setApproveForm({});
      setMessage({ type: "success", text: "已批准并添加到时间轴" });
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSavingApprove(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleReject = async (event: PendingEvent) => {
    setActionLoadingId(event.id);
    try {
      const res = await fetch("/api/pending-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reject", id: event.id, reason: rejectReason })
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "拒绝失败" });
        return;
      }

      setPending((prev) => prev.filter((item) => item.id !== event.id));
      setRejections((prev) => [
        ...prev,
        {
          id: event.id,
          title: event.title,
          rejectedAt: new Date().toISOString(),
          reason: rejectReason || "未提供原因"
        }
      ]);
      setSelected(null);
      setRejectReason("");
      setMessage({ type: "success", text: "已拒绝" });
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleClearRejections = async () => {
    setClearingRejections(true);
    try {
      const res = await fetch("/api/pending-events?action=clear-rejections", {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        setRejections([]);
        setShowClearConfirm(false);
        setMessage({ type: "success", text: "已清除所有拒绝记录" });
      } else {
        setMessage({ type: "error", text: "清除失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setClearingRejections(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f0df]">
        <div className="text-lg text-[#775e3b]">加载中...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f0df]">
        <div className="rounded-xl border border-[#e0c798] bg-[#fff8e9] px-6 py-4 text-[#775e3b]">
          未授权，请先登录
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f8f0df]">
      <header className="sticky top-0 z-50 border-b border-[#d5bd91] bg-[#f7f0df]/95 px-4 py-3 shadow-scroll backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <a href="/admin" className="flex items-center gap-1 text-sm text-[#775e3b] transition hover:text-[#5d4b31]">
            <ArrowLeft className="h-4 w-4" />
            返回
          </a>
          <h1 className="text-xl font-semibold text-[#2f2a22]">审批管理</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-y-auto p-6 pb-10">
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
              tab === "pending"
                ? "bg-[#6b4a00] text-white"
                : "border border-[#c9ad7d] bg-[#fff8e9] text-[#5d4b31] hover:bg-[#ead8b8]"
            )}
          >
            <Clock className="h-4 w-4" />
            待审批 ({pending.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("rejected")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
              tab === "rejected"
                ? "bg-[#6b4a00] text-white"
                : "border border-[#c9ad7d] bg-[#fff8e9] text-[#5d4b31] hover:bg-[#ead8b8]"
            )}
          >
            <Trash2 className="h-4 w-4" />
            已拒绝 ({rejections.length})
          </button>
        </div>

        {tab === "pending" ? (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="rounded-xl border border-[#e0c798] bg-[#fff8e9] p-10 text-center text-[#775e3b]">
                暂无待审批内容
              </div>
            ) : (
              pending.map((event) => (
                <div key={event.id} className="rounded-xl border border-[#dcc79f] bg-[#fff8e9] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-[#2f2a22]">{event.title}</h3>
                        <span className="rounded-full bg-[#e0c798] px-2 py-0.5 text-xs font-medium text-[#7a5e38]">
                          {CATEGORY_LABELS[event.category] ?? event.category}
                        </span>
                        <span className="rounded-full bg-[#deebf7] px-2 py-0.5 text-xs font-medium text-[#3f668a]">
                          {TYPE_LABELS[event.type] ?? event.type}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#775e3b]">
                        <span>{formatRange(event)}</span>
                        <span>申请日期：{new Date(event.appliedAt).toLocaleString("zh-CN")}</span>
                      </div>
                      {event.email ? (
                        <div className="mt-1 text-sm text-[#775e3b]">申请人邮箱：{event.email}</div>
                      ) : null}
                      <p className="mt-3 text-sm leading-relaxed text-[#5d4b31]">{event.summary}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => openApproveForm(event)}
                        disabled={actionLoadingId === event.id}
                        className="flex items-center gap-1 rounded-md bg-[#5f8d78] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#4f7d68] disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        同意
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(event);
                          setRejectReason("");
                        }}
                        className="flex items-center gap-1 rounded-md border border-[#b75f4b] px-3 py-2 text-sm font-medium text-[#b75f4b] transition hover:bg-[#b75f4b]/10"
                      >
                        <X className="h-4 w-4" />
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {rejections.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 rounded-md border border-[#b75f4b] px-3 py-2 text-sm font-medium text-[#b75f4b] transition hover:bg-[#b75f4b]/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清除全部
                </button>
              </div>
            )}
            {rejections.length === 0 ? (
              <div className="rounded-xl border border-[#e0c798] bg-[#fff8e9] p-10 text-center text-[#775e3b]">
                暂无拒绝记录
              </div>
            ) : (
              rejections.map((item, index) => (
                <div key={`${item.id}-${index}`} className="rounded-xl border border-[#e0c798] bg-[#fff8e9] p-5">
                  <h3 className="font-semibold text-[#2f2a22]">{item.title}</h3>
                  <div className="mt-1 text-sm text-[#775e3b]">
                    ID: {item.id} | 拒绝时间：{new Date(item.rejectedAt).toLocaleString("zh-CN")}
                  </div>
                  {item.reason ? <p className="mt-2 text-sm text-[#8d7652]">原因：{item.reason}</p> : null}
                </div>
              ))
            )}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
              <h3 className="mb-3 text-lg font-semibold text-[#2f2a22]">确认拒绝</h3>
              <p className="mb-3 text-sm text-[#5d4b31]">要拒绝 <strong>{selected.title}</strong> 吗？</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                placeholder="拒绝原因（可选）"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md border border-[#c9ad7d] px-4 py-2 text-sm text-[#5d4b31] transition hover:bg-[#ead8b8]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(selected)}
                  disabled={actionLoadingId === selected.id}
                  className="rounded-md bg-[#b75f4b] px-4 py-2 text-sm text-white transition hover:bg-[#a05040] disabled:opacity-50"
                >
                  {actionLoadingId === selected.id ? "处理中..." : "确认拒绝"}
                </button>
              </div>
            </div>
          </div>
        )}

        {approveEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2f2a22]">编辑事件信息</h3>
                <button
                  type="button"
                  onClick={() => { setApproveEvent(null); setApproveForm({}); }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d0b384] text-[#684b24] transition hover:bg-[#ead8b8]"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">ID <span className="text-red-500">*</span></label>
                  <input
                    value={approveForm.id ?? ""}
                    onChange={(e) => setApproveForm((prev) => ({ ...prev, id: e.target.value }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">标题 <span className="text-red-500">*</span></label>
                  <input
                    value={approveForm.title ?? ""}
                    onChange={(e) => setApproveForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#5d4b31]">开始年份 <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={approveForm.startYear ?? ""}
                      onChange={(e) => setApproveForm((prev) => ({ ...prev, startYear: Number(e.target.value) }))}
                      className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#5d4b31]">结束年份</label>
                    <input
                      type="number"
                      value={approveForm.endYear ?? ""}
                      onChange={(e) => setApproveForm((prev) => ({ ...prev, endYear: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">类型 <span className="text-red-500">*</span></label>
                  <select
                    value={approveForm.type ?? "event"}
                    onChange={(e) => setApproveForm((prev) => ({ ...prev, type: e.target.value as "event" | "era" }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  >
                    <option value="event">事件</option>
                    <option value="era">朝代</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">分类 <span className="text-red-500">*</span></label>
                  <select
                    value={approveForm.category ?? ""}
                    onChange={(e) => setApproveForm((prev) => ({ ...prev, category: e.target.value }))}
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
                    value={approveForm.rail ?? "main"}
                    onChange={(e) => setApproveForm((prev) => ({ ...prev, rail: e.target.value }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  >
                    <option value="main">主线轨道（右侧）</option>
                    <option value="global_long">长期轨道（左侧）</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">简介 <span className="text-red-500">*</span></label>
                  <textarea
                    value={approveForm.summary ?? ""}
                    onChange={(e) => setApproveForm((prev) => ({ ...prev, summary: e.target.value }))}
                    rows={4}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setApproveEvent(null); setApproveForm({}); }}
                  className="rounded-md border border-[#c9ad7d] px-4 py-2 text-sm text-[#5d4b31] transition hover:bg-[#ead8b8]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={savingApprove}
                  className="rounded-md bg-[#5f8d78] px-4 py-2 text-sm text-white transition hover:bg-[#4f7d68] disabled:opacity-50"
                >
                  {savingApprove ? "添加中..." : "确认并批准"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
              <h3 className="mb-3 text-lg font-semibold text-[#2f2a22]">确认清除</h3>
              <p className="mb-4 text-sm text-[#5d4b31]">要清除全部 <strong>{rejections.length}</strong> 条拒绝记录吗？此操作不可撤销。</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-md border border-[#c9ad7d] px-4 py-2 text-sm text-[#5d4b31] transition hover:bg-[#ead8b8]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleClearRejections}
                  disabled={clearingRejections}
                  className="rounded-md bg-[#b75f4b] px-4 py-2 text-sm text-white transition hover:bg-[#a05040] disabled:opacity-50"
                >
                  {clearingRejections ? "清除中..." : "确认清除"}
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
      </main>
    </div>
  );
}
