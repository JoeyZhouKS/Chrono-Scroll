import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PENDING_FILE = path.join(process.cwd(), "data", "pending_events.json");
const EVENTS_FILE = path.join(process.cwd(), "data", "timeline-events.json");
const REJECTION_LOG_FILE = path.join(process.cwd(), "data", "rejection_log.json");

async function readPendingEvents(): Promise<Array<Record<string, unknown>>> {
  try {
    const content = await fs.readFile(PENDING_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writePendingEvents(events: Array<Record<string, unknown>>): Promise<void> {
  await fs.writeFile(PENDING_FILE, JSON.stringify(events, null, 2) + "\n", "utf-8");
}

async function readOfficialEvents(): Promise<Array<Record<string, unknown>>> {
  try {
    const content = await fs.readFile(EVENTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeOfficialEvents(events: Array<Record<string, unknown>>): Promise<void> {
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2) + "\n", "utf-8");
}

async function readRejectionLog(): Promise<Array<Record<string, unknown>>> {
  try {
    const content = await fs.readFile(REJECTION_LOG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeRejectionLog(log: Array<Record<string, unknown>>): Promise<void> {
  await fs.writeFile(REJECTION_LOG_FILE, JSON.stringify(log, null, 2) + "\n", "utf-8");
}

// GET /api/pending-events - List all pending events and rejection log
export async function GET() {
  try {
    const pending = await readPendingEvents();
    const rejections = await readRejectionLog();
    return NextResponse.json({ pending, rejections });
  } catch (error) {
    console.error("Failed to read pending events:", error);
    return NextResponse.json({ error: "读取待审批事件失败" }, { status: 500 });
  }
}

// POST /api/pending-events - Add a new pending event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { action, id, reason } = body;

    // Handle approve action
    if (action === "approve" && id) {
      const pending = await readPendingEvents();
      const index = pending.findIndex((item) => item.id === id);

      if (index === -1) {
        return NextResponse.json({ error: "未找到待审批事件" }, { status: 404 });
      }

      const originalEvent = pending[index];
      const official = await readOfficialEvents();

      const eventData = (body.event as Record<string, unknown>) || {};
      const finalEvent: Record<string, unknown> = {
        id: eventData.id || originalEvent.id,
        title: eventData.title,
        startYear: eventData.startYear,
        endYear: eventData.endYear,
        type: eventData.type,
        category: eventData.category,
        summary: eventData.summary,
      };
      if (eventData.rail) {
        finalEvent.rail = eventData.rail;
      }

      if (official.some((e) => e.id === finalEvent.id)) {
        return NextResponse.json({ error: "该事件已存在于正式数据中" }, { status: 409 });
      }

      official.push(finalEvent);
      pending.splice(index, 1);
      await writeOfficialEvents(official);
      await writePendingEvents(pending);

      return NextResponse.json({ success: true, event: finalEvent });
    }

    // Handle reject action
    if (action === "reject" && id) {
      const pending = await readPendingEvents();
      const index = pending.findIndex((item) => item.id === id);

      if (index === -1) {
        return NextResponse.json({ error: "未找到待审批事件" }, { status: 404 });
      }

      const rejectedEvent = pending[index];
      const rejections = await readRejectionLog();

      // Log the rejection
      rejections.push({
        id: rejectedEvent.id,
        title: rejectedEvent.title,
        rejectedAt: new Date().toISOString(),
        reason: reason || "未提供原因"
      });

      // Remove from pending
      pending.splice(index, 1);
      await writeRejectionLog(rejections);
      await writePendingEvents(pending);

      return NextResponse.json({ success: true });
    }

    // Add new pending event
    if (!body.title || body.startYear === undefined) {
      return NextResponse.json({ error: "请填写事件名称和年份" }, { status: 400 });
    }

    // If id is not provided, generate one from title
    const eventSlug = body.id || String(body.title)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const pending = await readPendingEvents();

    // Check if already pending
    if (pending.some((item) => item.id === eventSlug)) {
      return NextResponse.json({ error: "该事件已在待审批队列中" }, { status: 409 });
    }

    const pendingEvent = {
      id: eventSlug,
      title: String(body.title),
      startYear: Number(body.startYear),
      endYear: body.endYear ? Number(body.endYear) : undefined,
      type: body.type || "event",
      category: body.category || "culture",
      rail: body.rail ? String(body.rail) : undefined,
      summary: body.summary ? String(body.summary) : "",
      email: body.email ? String(body.email) : undefined,
      appliedAt: body.appliedAt || new Date().toISOString(),
      status: "pending"
    };

    const filtered = Object.fromEntries(
      Object.entries(pendingEvent).filter(([, value]) => value !== undefined)
    );

    pending.push(filtered);
    await writePendingEvents(pending);

    return NextResponse.json({ success: true, event: filtered }, { status: 201 });
  } catch (error) {
    console.error("Failed to process pending event:", error);
    return NextResponse.json({ error: "处理请求失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "clear-rejections") {
    await writeRejectionLog([]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
