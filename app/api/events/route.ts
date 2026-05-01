import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

const EVENTS_FILE = path.join(process.cwd(), "data", "timeline-events.json");

export async function GET() {
  const content = await fs.readFile(EVENTS_FILE, "utf-8");
  return new NextResponse(content, {
    headers: { "Content-Type": "application/json" }
  });
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const { id, ...updates } = await request.json() as {
    id: string;
    title?: string;
    startYear?: number;
    endYear?: number;
    type?: string;
    category?: string;
    rail?: string;
    summary?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "缺少事件 ID" }, { status: 400 });
  }

  const content = await fs.readFile(EVENTS_FILE, "utf-8");
  const events = JSON.parse(content) as Array<Record<string, unknown>>;
  const index = events.findIndex((event) => event.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "未找到该事件" }, { status: 404 });
  }

  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== null)
  );
  const deletedKeys = Object.keys(updates).filter((key) => updates[key as keyof typeof updates] === null);
  const merged = { ...events[index], ...filteredUpdates };
  deletedKeys.forEach((key) => {
    delete merged[key as keyof typeof merged];
  });
  events[index] = merged;
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2) + "\n", "utf-8");

  return NextResponse.json({ success: true, event: events[index] });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const body = await request.json() as Record<string, unknown>;

  if (!body.id || !body.title || body.startYear === undefined || !body.type || !body.category || !body.summary) {
    return NextResponse.json({ error: "缺少必填字段：id、title、startYear、type、category、summary" }, { status: 400 });
  }

  const content = await fs.readFile(EVENTS_FILE, "utf-8");
  const events = JSON.parse(content) as Array<Record<string, unknown>>;

  const existing = events.find((event) => event.id === body.id);
  if (existing) {
    return NextResponse.json({ error: "该事件 ID 已存在" }, { status: 409 });
  }

  const newEvent = {
    id: String(body.id),
    title: String(body.title),
    startYear: Number(body.startYear),
    endYear: body.endYear ? Number(body.endYear) : undefined,
    type: String(body.type),
    category: String(body.category),
    rail: body.rail ? String(body.rail) : undefined,
    summary: String(body.summary)
  };

  // Filter out undefined values
  const filtered = Object.fromEntries(
    Object.entries(newEvent).filter(([, value]) => value !== undefined)
  );

  events.push(filtered);
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2) + "\n", "utf-8");

  return NextResponse.json({ success: true, event: filtered }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedResponse();
  }

  const { ids } = await request.json() as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "未提供事件 ID" }, { status: 400 });
  }

  const content = await fs.readFile(EVENTS_FILE, "utf-8");
  const events = JSON.parse(content) as Array<{ id: string }>;
  const filtered = events.filter((event) => !ids.includes(event.id));

  if (filtered.length === events.length) {
    return NextResponse.json({ error: "未找到匹配的事件" }, { status: 404 });
  }

  await fs.writeFile(EVENTS_FILE, JSON.stringify(filtered, null, 2) + "\n", "utf-8");

  return NextResponse.json({
    success: true,
    deleted: events.length - filtered.length,
    remaining: filtered.length
  });
}
