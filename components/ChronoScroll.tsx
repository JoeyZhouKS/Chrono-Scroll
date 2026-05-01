"use client";

import clsx from "clsx";
import { CalendarClock, LocateFixed, PanelRightClose, Search, X, Pencil, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type UIEvent
} from "react";
import {
  TIMELINE_EVENT_IMAGES,
  TIMELINE_EVENTS,
  type EventCategory,
  type TimelineEvent,
  type TimelineEventImage
} from "@/data/timeline";
import { assignEventLanes, LANE_WIDTH, type PositionedTimelineEvent } from "@/lib/laneAssignment";
import {
  clampYearToRange,
  durationToHeight,
  formatYear,
  getRangeEnd,
  indexToYear,
  rangesOverlap,
  yearToIndex,
  yearToY,
  yearsBetween
} from "@/lib/yearUtils";

const DEFAULT_RANGE = {
  startYear: -3000,
  endYear: 2026
};

const BACKGROUND_COLUMN_MIN_WIDTH = 126;
const YEAR_AXIS_WIDTH = 107;
const ERA_COLUMN_WIDTH = 120;
const ERA_FLOATING_LABEL_HEIGHT = 64;
const ERA_COMPACT_LABEL_HEIGHT = 28;
const EVENT_BAR_WIDTH = 100;
const ERA_BAR_WIDTH = 72;
const ERA_LANE_WIDTH = 80;
const BACKGROUND_BAR_WIDTH = 64;
const BACKGROUND_LANE_WIDTH = 72;
const ANNOTATION_BAR_WIDTH = 64;
const TRACK_INSET = 16;
const ERA_TRACK_INSET = TRACK_INSET;
const BACKGROUND_TRACK_INSET = 12;
const BACKGROUND_LONG_EVENT_MIN_YEARS = 50;

type CategoryFilter = "all" | EventCategory;

const FIXED_ROW_HEIGHT = 40;
const FIXED_TICK_INTERVAL = 10;

const CATEGORY_OPTIONS: Array<{ label: string; value: CategoryFilter }> = [
  { label: "全部", value: "all" },
  { label: "朝代/时代", value: "era" },
  { label: "战争", value: "war" },
  { label: "政治", value: "politics" },
  { label: "文化", value: "culture" },
  { label: "科技", value: "technology" },
  { label: "革命", value: "revolution" },
  { label: "外交", value: "diplomacy" },
  { label: "经济", value: "economy" }
];

const CATEGORY_LABELS: Record<EventCategory, string> = {
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

const EVENT_CATEGORY_STYLES: Record<EventCategory, string> = {
  era: "border-[#b99661] bg-[#f0dec0] text-[#604321]",
  dynasty: "border-[#b99661] bg-[#f0dec0] text-[#604321]",
  war: "border-[#b75f4b] bg-[#f5d5cb] text-[#6f3328]",
  politics: "border-[#be8d4a] bg-[#f0dfbd] text-[#674515]",
  culture: "border-[#7b75ad] bg-[#dedcf1] text-[#3f3a6d]",
  technology: "border-[#5f8d78] bg-[#d9eadf] text-[#2f5b4b]",
  revolution: "border-[#be6d74] bg-[#f0d0d7] text-[#703540]",
  diplomacy: "border-[#486a8b] bg-[#d8e5ef] text-[#2a4966]",
  economy: "border-[#8aa060] bg-[#e6edcb] text-[#4c5e27]",
  society: "border-[#8d7c6b] bg-[#eadfd2] text-[#524337]"
};

function isMajorTick(year: number, tickInterval: number, startYear: number, endYear: number) {
  return year === startYear || year === endYear || year % tickInterval === 0;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function rangeText(event: TimelineEvent) {
  const endYear = getRangeEnd(event.startYear, event.endYear);

  if (endYear === event.startYear) {
    return formatYear(event.startYear);
  }

  return `${formatYear(event.startYear)} - ${formatYear(endYear)}`;
}

function shouldShowEventDateRange(event: TimelineEvent) {
  const endYear = getRangeEnd(event.startYear, event.endYear);

  return endYear !== event.startYear && yearsBetween(event.startYear, endYear) > 30;
}

function isBackgroundAnnotation(event: TimelineEvent) {
  return event.rail === "global_long";
}

function shouldRenderOnTimeline(event: TimelineEvent) {
  if (event.type === "era") return true;
  if (isBackgroundAnnotation(event)) return false;

  return true;
}

function eventMatchesCategory(event: TimelineEvent, categories: CategoryFilter[]) {
  if (categories.length === 8) return true;
  if (categories.includes("era") && (event.type === "era" || event.category === "dynasty" || event.category === "era")) return true;

  return categories.includes(event.category);
}

function eventMatchesSearch(event: TimelineEvent, query: string) {
  if (!query) return true;

  const normalizedQuery = query.trim().toLowerCase();
  return event.title.toLowerCase().includes(normalizedQuery);
}

function isChinaEra(event: TimelineEvent) {
  return event.type === "era" && event.id.startsWith("china-");
}

function isInternationalLongRangeEvent(event: TimelineEvent) {
  if (event.rail === "main") return false;
  if (event.rail === "global_long") return true;
  if (event.id.startsWith("china-")) return false;
  if (event.type === "era") return false;
  const endYear = getRangeEnd(event.startYear, event.endYear);
  if (endYear === event.startYear) return false;
  if (event.startYear < 500) return false;

  const duration = yearsBetween(event.startYear, endYear);
  if (duration < BACKGROUND_LONG_EVENT_MIN_YEARS) return false;

  return (
    event.category === "politics" ||
    event.category === "diplomacy" ||
    event.category === "economy" ||
    event.category === "technology" ||
    event.category === "era" ||
    event.category === "dynasty"
  );
}

function parseHistoricalInput(value: string) {
  if (!value.trim()) return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed === 0) return null;

  return parsed;
}

function getEventImage(event: TimelineEvent | null): TimelineEventImage | null {
  if (!event) return null;

  return TIMELINE_EVENT_IMAGES[event.id] ?? null;
}

export function ChronoScroll({ isAdmin = false }: { isAdmin?: boolean }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToRecentRef = useRef(false);
  const range = DEFAULT_RANGE;
  const [categories, setCategories] = useState<CategoryFilter[]>([
    "era",
    "war",
    "politics",
    "culture",
    "technology",
    "revolution",
    "diplomacy",
    "economy"
  ]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [, setEventsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: "", startYear: "", endYear: "", summary: "", email: "" });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [jumpYear, setJumpYear] = useState("755");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  type EditFormState = Partial<TimelineEvent>;
  const [editForm, setEditForm] = useState<EditFormState>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch {
      // fallback to static data on error
      setTimelineEvents(TIMELINE_EVENTS);
    }
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-container]")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const rowHeight = FIXED_ROW_HEIGHT;
  const tickInterval = FIXED_TICK_INTERVAL;
  const totalYears = yearsBetween(range.startYear, range.endYear);
  const totalHeight = totalYears * rowHeight;
  const rangeStartIndex = yearToIndex(range.startYear);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    setViewportHeight(viewport.clientHeight || 800);

    const resizeObserver = new ResizeObserver(() => {
      setViewportHeight(viewport.clientHeight || 800);
    });

    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, []);

  const scrollToRecent = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const nextScrollTop = Math.max(0, totalHeight - viewport.clientHeight);
    viewport.scrollTo({ top: nextScrollTop });
    setScrollTop(nextScrollTop);
  }, [totalHeight]);

  useEffect(() => {
    if (hasScrolledToRecentRef.current || totalHeight <= 0) return;

    hasScrolledToRecentRef.current = true;
    requestAnimationFrame(scrollToRecent);
  }, [scrollToRecent, totalHeight]);

  const handleViewportScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const jumpToYear = useCallback(() => {
    const parsedYear = parseHistoricalInput(jumpYear);
    if (parsedYear === null) return;

    const clampedYear = clampYearToRange(parsedYear, range.startYear, range.endYear);
    const targetTop = yearToY(clampedYear, range.startYear, rowHeight);

    viewportRef.current?.scrollTo({
      top: targetTop,
      behavior: "smooth"
    });
  }, [jumpYear, range.endYear, range.startYear, rowHeight]);

  const handleSubmitRequest = async () => {
    if (!requestForm.title || !requestForm.startYear) {
      setMessage({ type: "error", text: "请填写事件名称和年份" });
      return;
    }
    setRequestSubmitting(true);
    try {
      const slug = requestForm.title
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const res = await fetch("/api/pending-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: slug,
          title: requestForm.title,
          startYear: Number(requestForm.startYear),
          endYear: requestForm.endYear ? Number(requestForm.endYear) : undefined,
          type: "event",
          category: "culture",
          summary: requestForm.summary || "",
          email: requestForm.email,
          appliedAt: new Date().toISOString()
        })
      });
      if (res.ok) {
        setShowRequestForm(false);
        setShowThankYou(true);
        setRequestForm({ title: "", startYear: "", endYear: "", summary: "", email: "" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "提交失败" });
      }
    } catch {
      setMessage({ type: "error", text: "提交失败" });
    }
    setRequestSubmitting(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const scrollToEvent = useCallback((event: TimelineEvent) => {
    const clampedYear = clampYearToRange(event.startYear, range.startYear, range.endYear);
    const targetTop = yearToY(clampedYear, range.startYear, rowHeight);

    viewportRef.current?.scrollTo({
      top: targetTop,
      behavior: "smooth"
    });
    setSelectedEvent(event);
  }, [range.startYear, range.endYear, rowHeight]);

  const visibleWindow = useMemo(() => {
    const bufferYears = Math.max(32, Math.ceil(viewportHeight / rowHeight));
    const firstOffset = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferYears);
    const lastOffset = Math.min(
      totalYears - 1,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + bufferYears
    );

    const startYear = indexToYear(rangeStartIndex + firstOffset);
    const endYear = indexToYear(rangeStartIndex + lastOffset);

    return {
      firstOffset,
      lastOffset,
      startYear,
      endYear
    };
  }, [rangeStartIndex, rowHeight, scrollTop, totalYears, viewportHeight]);

  const visibleRows = useMemo(() => {
    const rows: Array<{ year: number; top: number; major: boolean; labeled: boolean }> = [];

    for (let offset = visibleWindow.firstOffset; offset <= visibleWindow.lastOffset; offset += 1) {
      const year = indexToYear(rangeStartIndex + offset);
      rows.push({
        year,
        top: offset * rowHeight,
        major: isMajorTick(year, tickInterval, range.startYear, range.endYear),
        labeled: true
      });
    }

    return rows;
  }, [
    range.endYear,
    range.startYear,
    rangeStartIndex,
    rowHeight,
    tickInterval,
    visibleWindow.firstOffset,
    visibleWindow.lastOffset
  ]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return timelineEvents.filter((event) => eventMatchesSearch(event, searchQuery));
  }, [searchQuery, timelineEvents]);

  const filteredEvents = useMemo(() => {
    return timelineEvents.filter((event) => {
      const eventEndYear = getRangeEnd(event.startYear, event.endYear);
      return (
        rangesOverlap(event.startYear, eventEndYear, range.startYear, range.endYear) &&
        shouldRenderOnTimeline(event) &&
        eventMatchesCategory(event, categories) &&
        eventMatchesSearch(event, searchQuery)
      );
    });
  }, [categories, range.endYear, range.startYear, searchQuery, timelineEvents]);

  const internationalLongRangeEvents = useMemo(() => {
    return filteredEvents.filter((event) => isInternationalLongRangeEvent(event));
  }, [filteredEvents]);

  const positionedEvents = useMemo(() => {
    return assignEventLanes(
      filteredEvents.filter((event) => event.type !== "era" && !isInternationalLongRangeEvent(event))
    );
  }, [filteredEvents]);

  const positionedEras = useMemo(() => {
    return assignEventLanes(filteredEvents.filter((event) => isChinaEra(event)), {
      allowSharedBoundary: true,
      preferExactBoundaryLane: false,
      preferLastAvailableLane: false
    });
  }, [filteredEvents]);

  const positionedGlobalRanges = useMemo(() => {
    const annotations = timelineEvents.filter((event) => {
      return isBackgroundAnnotation(event) && eventMatchesCategory(event, categories) && eventMatchesSearch(event, searchQuery);
    });
    const allEvents = [...internationalLongRangeEvents, ...annotations];
    return assignEventLanes(allEvents, {
      allowSharedBoundary: true,
      preferExactBoundaryLane: false,
      preferLastAvailableLane: false
    });
  }, [categories, internationalLongRangeEvents, searchQuery, timelineEvents]);

  const eraBoundaryAdjustments = useMemo(() => {
    const startIdsByIndex = new Map<number, Set<string>>();
    const endIdsByIndex = new Map<number, Set<string>>();

    for (const era of positionedEras) {
      const startSet = startIdsByIndex.get(era.startIndex) ?? new Set<string>();
      startSet.add(era.id);
      startIdsByIndex.set(era.startIndex, startSet);

      const endSet = endIdsByIndex.get(era.endIndex) ?? new Set<string>();
      endSet.add(era.id);
      endIdsByIndex.set(era.endIndex, endSet);
    }

    const hasOtherId = (idSet: Set<string> | undefined, currentId: string) => {
      if (!idSet) return false;
      for (const id of idSet) {
        if (id !== currentId) return true;
      }
      return false;
    };

    const adjustments = new Map<string, { trimStartHalf: boolean; trimEndHalf: boolean }>();
    for (const era of positionedEras) {
      adjustments.set(era.id, {
        trimStartHalf: hasOtherId(endIdsByIndex.get(era.startIndex), era.id),
        trimEndHalf: hasOtherId(startIdsByIndex.get(era.endIndex), era.id)
      });
    }

    return adjustments;
  }, [positionedEras]);

  const backgroundBoundaryAdjustments = useMemo(() => {
    const startIdsByIndex = new Map<number, Set<string>>();
    const endIdsByIndex = new Map<number, Set<string>>();

    for (const event of positionedGlobalRanges) {
      const startSet = startIdsByIndex.get(event.startIndex) ?? new Set<string>();
      startSet.add(event.id);
      startIdsByIndex.set(event.startIndex, startSet);

      const endSet = endIdsByIndex.get(event.endIndex) ?? new Set<string>();
      endSet.add(event.id);
      endIdsByIndex.set(event.endIndex, endSet);
    }

    const hasOtherId = (idSet: Set<string> | undefined, currentId: string) => {
      if (!idSet) return false;
      for (const id of idSet) {
        if (id !== currentId) return true;
      }
      return false;
    };

    const adjustments = new Map<string, { trimStartHalf: boolean; trimEndHalf: boolean }>();
    for (const event of positionedGlobalRanges) {
      adjustments.set(event.id, {
        trimStartHalf: hasOtherId(endIdsByIndex.get(event.startIndex), event.id),
        trimEndHalf: hasOtherId(startIdsByIndex.get(event.endIndex), event.id)
      });
    }

    return adjustments;
  }, [positionedGlobalRanges]);

  const visibleEvents = useMemo(() => {
    return positionedEvents.filter((event) =>
      rangesOverlap(event.startYear, getRangeEnd(event.startYear, event.endYear), visibleWindow.startYear, visibleWindow.endYear)
    );
  }, [positionedEvents, visibleWindow.endYear, visibleWindow.startYear]);

  const visibleEras = useMemo(() => {
    return positionedEras.filter((event) =>
      rangesOverlap(event.startYear, getRangeEnd(event.startYear, event.endYear), visibleWindow.startYear, visibleWindow.endYear)
    );
  }, [positionedEras, visibleWindow.endYear, visibleWindow.startYear]);

  const visibleGlobalRanges = useMemo(() => {
    return positionedGlobalRanges.filter((event) =>
      !isBackgroundAnnotation(event) &&
      rangesOverlap(event.startYear, getRangeEnd(event.startYear, event.endYear), visibleWindow.startYear, visibleWindow.endYear)
    );
  }, [positionedGlobalRanges, visibleWindow.endYear, visibleWindow.startYear]);

  const visibleAnnotations = useMemo(() => {
    return positionedGlobalRanges.filter((event) =>
      isBackgroundAnnotation(event) &&
      rangesOverlap(event.startYear, getRangeEnd(event.startYear, event.endYear), visibleWindow.startYear, visibleWindow.endYear)
    );
  }, [positionedGlobalRanges, visibleWindow.endYear, visibleWindow.startYear]);

  

  const laneCount = useMemo(() => {
    return Math.max(4, positionedEvents.reduce((maxLane, event) => Math.max(maxLane, event.laneIndex + 1), 0));
  }, [positionedEvents]);

  const eraLaneCount = useMemo(() => {
    return Math.max(1, positionedEras.reduce((maxLane, era) => Math.max(maxLane, era.laneIndex + 1), 0));
  }, [positionedEras]);

  const backgroundLaneCount = useMemo(() => {
    return Math.max(1, positionedGlobalRanges.reduce((maxLane, event) => Math.max(maxLane, event.laneIndex + 1), 0));
  }, [positionedGlobalRanges]);

  const backgroundTrackWidth = BACKGROUND_BAR_WIDTH + Math.max(0, backgroundLaneCount - 1) * BACKGROUND_LANE_WIDTH;
  const backgroundColumnWidth = Math.max(BACKGROUND_COLUMN_MIN_WIDTH, backgroundTrackWidth + BACKGROUND_TRACK_INSET * 2);
  const backgroundTrackLeft = backgroundColumnWidth - BACKGROUND_TRACK_INSET - backgroundTrackWidth;
  const eraTrackWidth = ERA_BAR_WIDTH + Math.max(0, eraLaneCount - 1) * ERA_LANE_WIDTH;
  const eraColumnWidth = Math.max(ERA_COLUMN_WIDTH, eraTrackWidth + ERA_TRACK_INSET * 2);
  const eraColumnLeft = backgroundColumnWidth;
  const eraTrackLeft = eraColumnWidth - ERA_TRACK_INSET - eraTrackWidth;
  const eventAreaWidth = Math.max(200, laneCount * LANE_WIDTH + 44);
  const leftRailWidth = backgroundColumnWidth + eraColumnWidth + YEAR_AXIS_WIDTH;
  const yearAxisLeft = backgroundColumnWidth + eraColumnWidth;
  const totalWidth = leftRailWidth + eventAreaWidth;
  const backgroundLaneWidth = BACKGROUND_LANE_WIDTH;
  const eraLaneWidth = ERA_LANE_WIDTH;
  const hoveredEventImage = getEventImage(hoveredEvent);
  const handleEventMouseMove = (event: MouseEvent<HTMLButtonElement>, timelineEvent: TimelineEvent) => {
    setHoveredEvent(timelineEvent);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <header className="sticky top-0 z-50 shrink-0 border-b border-[#d5bd91] bg-[#f7f0df]/95 px-4 py-3 shadow-scroll backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-2 flex min-w-[220px] items-center gap-2">
            <CalendarClock className="h-5 w-5 text-cinnabar" aria-hidden="true" />
            <h1 className="text-xl font-semibold tracking-normal text-[#2f2a22]">历史长河 ChronoScroll</h1>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setShowRequestForm(true)}
              className="flex items-center gap-1.5 rounded-md border border-[#5f8d78] bg-[#5f8d78] px-3 py-1.5 text-sm text-white transition hover:bg-[#4f7d68]"
            >
              <Plus className="h-3.5 w-3.5" />
              申请添加事件
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-[#5d4b31]">分类</span>
            <div className="flex flex-wrap items-center gap-3">
              {CATEGORY_OPTIONS.filter((option) => option.value !== "all").map((option) => {
                const categoryValue = option.value as CategoryFilter;
                const isChecked = categories.includes(categoryValue);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-1.5 text-sm text-[#5d4b31]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCategories((prev) => [...prev, categoryValue]);
                        } else {
                          setCategories((prev) => {
                            const filtered = prev.filter((c) => c !== categoryValue);
                            if (filtered.length === 0) {
                              return prev;
                            }
                            return filtered;
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-[#c9ad7d] bg-[#fff8e9] text-cinnabar focus:ring-cinnabar/20"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="relative flex items-center" data-search-container>
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#8d7652]" aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setShowDropdown(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchQuery("");
                  setShowDropdown(false);
                }
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="搜索事件标题"
              className="h-9 w-64 rounded-md border border-[#c9ad7d] bg-[#fff8e9] pl-9 pr-8 text-sm outline-none transition focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                  setShowDropdown(false);
                }}
                className="absolute right-2 rounded px-1 text-[#8d7652] transition hover:bg-[#e8d8b8] hover:text-[#5d4b31]"
                aria-label="清除搜索"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            {showDropdown && searchQuery.trim() && searchResults.length > 0 ? (
              <div className="absolute left-0 top-11 z-50 max-h-64 w-64 overflow-y-auto rounded-lg border border-[#c9ad7d] bg-[#fff8e9] shadow-xl" data-search-container>
                {searchResults.slice(0, 10).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      scrollToEvent(event);
                      setSearchQuery(event.title);
                      setShowDropdown(false);
                    }}
                    className="w-full rounded px-3 py-2 text-left text-sm transition hover:bg-[#e8d8b8]"
                  >
                    <div className="font-medium text-[#2f2a22]">{event.title}</div>
                    <div className="text-xs text-[#775e3b]">
                      {rangeText(event)} · {CATEGORY_LABELS[event.category]}
                    </div>
                  </button>
                ))}
                {searchResults.length > 10 ? (
                  <div className="px-3 py-2 text-xs text-[#8d7652]">
                    共 {searchResults.length} 个结果，仅显示前 10 个
                  </div>
                ) : null}
              </div>
            ) : null}
          </label>

          <div className="flex items-center gap-2 rounded-lg border border-[#dcc79f] bg-[#fff7e7] px-2 py-1">
            <LocateFixed className="h-4 w-4 text-[#8d7652]" aria-hidden="true" />
            <input
              aria-label="跳转到年份"
              value={jumpYear}
              onChange={(event) => setJumpYear(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") jumpToYear();
              }}
              className="h-8 w-24 rounded-md border border-[#dac49a] bg-white/70 px-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
            />
            <button
              type="button"
              onClick={jumpToYear}
              className="h-8 rounded-md bg-jade px-3 text-sm font-medium text-white transition hover:bg-[#4f7966]"
            >
              跳转
            </button>
          </div>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-hidden border-t border-[#ead8b8]">
        <div
          ref={viewportRef}
          onScroll={handleViewportScroll}
          onClick={() => setSelectedEvent(null)}
          className="timeline-scrollbar h-full overflow-auto bg-[#f8f0df]"
        >
          <div
            className="paper-texture relative"
            style={{
              height: totalHeight,
              minHeight: "100%",
              width: totalWidth,
              minWidth: "100%"
            }}
          >
            <aside
              className="sticky left-0 z-40 bg-transparent shadow-[8px_0_18px_rgba(93,71,39,0.12)]"
              style={{ width: leftRailWidth, height: totalHeight }}
            >
              <div
                className="absolute left-0 top-0 overflow-hidden border-r border-[#8da5bc] bg-[#deebf7]/92"
                style={{ width: backgroundColumnWidth, height: totalHeight }}
              >
                {visibleGlobalRanges.map((event) => (
                  <BackgroundRangeBar
                    key={event.id}
                    event={event}
                    backgroundLaneCount={backgroundLaneCount}
                    trimStartHalf={backgroundBoundaryAdjustments.get(event.id)?.trimStartHalf ?? false}
                    trimEndHalf={backgroundBoundaryAdjustments.get(event.id)?.trimEndHalf ?? false}
                    viewStartYear={range.startYear}
                    rowHeight={rowHeight}
                    scrollTop={scrollTop}
                    viewportHeight={viewportHeight}
                    trackLeft={backgroundTrackLeft}
                    laneWidth={backgroundLaneWidth}
                    onMouseMove={handleEventMouseMove}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
                {visibleAnnotations.map((event) => (
                  <AnnotationBar
                    key={event.id}
                    event={event}
                    backgroundLaneCount={backgroundLaneCount}
                    trimStartHalf={backgroundBoundaryAdjustments.get(event.id)?.trimStartHalf ?? false}
                    trimEndHalf={backgroundBoundaryAdjustments.get(event.id)?.trimEndHalf ?? false}
                    viewStartYear={range.startYear}
                    rowHeight={rowHeight}
                    scrollTop={scrollTop}
                    viewportHeight={viewportHeight}
                    trackLeft={backgroundTrackLeft}
                    laneWidth={backgroundLaneWidth}
                    onMouseMove={handleEventMouseMove}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>

              <div
                className="absolute left-0 top-0 overflow-hidden border-r border-[#c7a66e] bg-[#f2e5ca]/95"
                style={{ left: eraColumnLeft, width: eraColumnWidth, height: totalHeight }}
              >
                {visibleEras.map((era) => (
                  <EraRangeBar
                    key={era.id}
                    era={era}
                    eraLaneCount={eraLaneCount}
                    trimStartHalf={eraBoundaryAdjustments.get(era.id)?.trimStartHalf ?? false}
                    trimEndHalf={eraBoundaryAdjustments.get(era.id)?.trimEndHalf ?? false}
                    viewStartYear={range.startYear}
                    rowHeight={rowHeight}
                    scrollTop={scrollTop}
                    viewportHeight={viewportHeight}
                    trackLeft={eraTrackLeft}
                    laneWidth={eraLaneWidth}
                    onMouseMove={handleEventMouseMove}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => setSelectedEvent(era)}
                  />
                ))}
              </div>

              <div
                className="absolute top-0 border-r border-[#b9932c] bg-[#f6e8ba]"
                style={{ left: yearAxisLeft, width: YEAR_AXIS_WIDTH, height: totalHeight }}
              >
                <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-r from-transparent to-[#c6a03d]/38" />
                {visibleRows.map((row) => (
                  <div
                    key={`year-tick-${row.year}`}
                    className="group absolute left-0 flex items-start"
                    style={{
                      top: row.top,
                      width: YEAR_AXIS_WIDTH,
                      height: rowHeight
                    }}
                    title={formatYear(row.year)}
                  >
                    <div
                      className={clsx(
                        "absolute right-0 top-0 border-t transition-colors",
                        row.major ? "w-7 border-[#9a6d0d]" : "w-4 border-[#d9bd68]",
                        "group-hover:w-9 group-hover:border-[#7d5600]"
                      )}
                    />
                    <div
                      className={clsx(
                        "absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-right text-xs font-semibold transition",
                        row.labeled
                          ? "bg-[#f6e8ba] text-[#6b4a00]"
                          : "pointer-events-none bg-[#6b4a00] text-white opacity-0 shadow-md group-hover:opacity-100"
                      )}
                    >
                      {formatYear(row.year)}
                    </div>
                  </div>
                ))}
                <div
                  className="absolute right-0 w-7 border-t border-[#9a6d0d]"
                  style={{ top: totalHeight - 1 }}
                  title={`${formatYear(range.endYear)}结束`}
                />
              </div>
            </aside>

            <section
              className="absolute top-0 z-10"
              style={{
                left: leftRailWidth,
                width: eventAreaWidth,
                height: totalHeight
              }}
            >
              {visibleEvents.map((event) => (
                <TimelineEventBar
                  key={event.id}
                  event={event}
                  viewStartYear={range.startYear}
                  rowHeight={rowHeight}
                  scrollTop={scrollTop}
                  viewportHeight={viewportHeight}
                  onMouseMove={handleEventMouseMove}
                  onMouseLeave={() => setHoveredEvent(null)}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}
            </section>

          </div>
        </div>
      </section>

      {hoveredEvent ? (
        <div
          className="pointer-events-none fixed z-[80] w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#c19f6b] bg-[#fff9ed] p-3 text-sm text-[#3b2e1c] shadow-xl"
          style={{
            left: tooltipPosition.x + 16,
            top: tooltipPosition.y + 16
          }}
        >
          {hoveredEventImage ? (
            <Image
              src={hoveredEventImage.src}
              alt={hoveredEventImage.alt}
              width={320}
              height={180}
              className="mb-3 aspect-video w-full rounded-md border border-[#e0c798] object-cover"
            />
          ) : null}
          <div className="mb-1 font-semibold">{hoveredEvent.title}</div>
          <div className="text-xs text-[#775e3b]">{rangeText(hoveredEvent)}</div>
          <div className="mt-1 text-xs text-[#775e3b]">
            {CATEGORY_LABELS[hoveredEvent.category]}
          </div>
          <p className="mt-2 leading-relaxed">{hoveredEvent.summary}</p>
        </div>
      ) : null}

      <EventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isAdmin={isAdmin}
        onEdit={(event) => {
          setEditingEvent(event);
          setEditForm({ ...event });
        }}
        onDeleted={async () => {
          if (!selectedEvent) return;
          try {
            const res = await fetch("/api/events", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [selectedEvent.id] })
            });
            if (res.ok) {
              setMessage({ type: "success", text: "删除成功" });
              setSelectedEvent(null);
              await fetchEvents();
            } else {
              setMessage({ type: "error", text: "删除失败" });
            }
          } catch {
            setMessage({ type: "error", text: "删除失败" });
          }
          setTimeout(() => setMessage(null), 3000);
        }}
      />

      {showRequestForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2f2a22]">申请添加事件</h3>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d0b384] text-[#684b24] transition hover:bg-[#ead8b8]"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">
                  事件名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={requestForm.title}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：李白出生"
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">
                    年份 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={requestForm.startYear}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, startYear: e.target.value }))}
                    placeholder="例如：701"
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">结束年份</label>
                  <input
                    type="number"
                    value={requestForm.endYear}
                    onChange={(e) => setRequestForm((prev) => ({ ...prev, endYear: e.target.value }))}
                    placeholder="可选"
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">简介</label>
                <textarea
                  value={requestForm.summary}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, summary: e.target.value }))}
                  rows={3}
                  placeholder="可选，简要描述该事件"
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">申请人邮箱</label>
                <input
                  type="email"
                  value={requestForm.email}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="可选，用于联系您"
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="rounded-md border border-[#c9ad7d] px-4 py-2 text-sm text-[#5d4b31] transition hover:bg-[#ead8b8]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={requestSubmitting}
                className="rounded-md bg-[#5f8d78] px-4 py-2 text-sm text-white transition hover:bg-[#4f7d68] disabled:opacity-50"
              >
                {requestSubmitting ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showThankYou && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#5f8d78]">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#2f2a22]">提交成功</h3>
              <p className="mt-2 text-[#5d4b31]">感谢您的提交，我们会尽快审核</p>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowThankYou(false)}
                className="rounded-md bg-[#5f8d78] px-6 py-2 text-sm text-white transition hover:bg-[#4f7d68]"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={clsx(
            "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg",
            message.type === "success" ? "bg-[#5f8d78] text-white" : "bg-[#b75f4b] text-white"
          )}
        >
          {message.text}
        </div>
      )}



      {editingEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#c9ad7d] bg-[#fff8e9] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#2f2a22]">编辑事件</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setEditForm({});
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d0b384] text-[#684b24] transition hover:bg-[#ead8b8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">标题</label>
                <input
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">开始年份</label>
                  <input
                    type="number"
                    value={editForm.startYear ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, startYear: Number(e.target.value) }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d4b31]">结束年份</label>
                  <input
                    type="number"
                    value={editForm.endYear ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, endYear: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">类型</label>
                <select
                  value={editForm.type ?? "event"}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value as "event" | "era" }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                >
                  <option value="event">事件</option>
                  <option value="era">朝代</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">轨道位置</label>
                <select
                  value={editForm.rail ?? "main"}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, rail: e.target.value as "main" | "global_long" }))}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                >
                  <option value="main">主线轨道（右侧）</option>
                  <option value="global_long">长期轨道（左侧）</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#5d4b31]">简介</label>
                <textarea
                  value={editForm.summary ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, summary: e.target.value }))}
                  rows={4}
                  className="w-full rounded-md border border-[#c9ad7d] bg-white/70 px-3 py-2 text-sm outline-none focus:border-cinnabar focus:ring-2 focus:ring-cinnabar/20"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setEditForm({});
                }}
                className="rounded-md border border-[#c9ad7d] px-4 py-2 text-sm text-[#5d4b31] transition hover:bg-[#ead8b8]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch("/api/events", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: editingEvent.id, ...editForm })
                    });
                    if (res.ok) {
                      setMessage({ type: "success", text: "保存成功" });
                      setEditingEvent(null);
                      setEditForm({});
                      await fetchEvents();
                    } else {
                      setMessage({ type: "error", text: "保存失败" });
                    }
                  } catch {
                    setMessage({ type: "error", text: "保存失败" });
                  }
                  setSaving(false);
                  setTimeout(() => setMessage(null), 3000);
                }}
                disabled={saving}
                className="rounded-md bg-[#6b4a00] px-4 py-2 text-sm text-white transition hover:bg-[#5a3e00] disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TimelineEventBar({
  event,
  viewStartYear,
  rowHeight,
  scrollTop,
  viewportHeight,
  onMouseMove,
  onMouseLeave,
  onClick
}: {
  event: PositionedTimelineEvent;
  viewStartYear: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  onMouseMove: (mouseEvent: MouseEvent<HTMLButtonElement>, timelineEvent: TimelineEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const endYear = getRangeEnd(event.startYear, event.endYear);
  const isPoint = endYear === event.startYear;
  const top = yearToY(event.startYear, viewStartYear, rowHeight);
  const left = event.laneIndex * LANE_WIDTH + TRACK_INSET;
  const height = isPoint ? rowHeight : durationToHeight(event.startYear, endYear, rowHeight);
  const width = EVENT_BAR_WIDTH;
  const style: CSSProperties = {
    top,
    left,
    width,
    height
  };
  const eventLabelHeight = shouldShowEventDateRange(event) ? 50 : 52;
  const visibleEventTop = Math.max(top, scrollTop);
  const visibleEventBottom = Math.min(top + height, scrollTop + viewportHeight);
  const visibleEventMiddle = (visibleEventTop + visibleEventBottom) / 2;
  const maxLabelOffset = Math.max(4, height - eventLabelHeight - 4);
  const labelOffset = clampNumber(visibleEventMiddle - top - eventLabelHeight / 2, 4, maxLabelOffset);
  const periodLabelVertical = false;

  return (
    <button
      type="button"
      className={clsx(
        "absolute overflow-hidden rounded-md border px-2 text-xs font-semibold shadow-sm outline-none transition hover:-translate-y-0.5 hover:shadow-md focus:ring-2 focus:ring-[#8b6131]/25",
        EVENT_CATEGORY_STYLES[event.category],
        "flex items-center justify-center text-center"
      )}
      style={style}
      onMouseMove={(mouseEvent) => onMouseMove(mouseEvent, event)}
      onMouseLeave={onMouseLeave}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={`${event.title} ${rangeText(event)}`}
    >
      {isPoint ? (
        <span
          className="relative z-10 block w-full overflow-hidden bg-inherit px-0.5 text-center leading-tight"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            textOverflow: "ellipsis",
            wordBreak: "break-all"
          }}
        >
          {event.title}
        </span>
      ) : (
        <span
          className={clsx(
            "absolute left-0.5 right-0.5 z-10 flex items-center justify-center text-center leading-tight",
            periodLabelVertical ? "text-xs" : "flex-col"
          )}
          style={{
            top: labelOffset,
            minHeight: eventLabelHeight,
            writingMode: periodLabelVertical ? "vertical-rl" : "horizontal-tb"
          }}
        >
          <span
            className="max-w-full font-bold"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-all"
            }}
          >
            {event.title}
          </span>
          {shouldShowEventDateRange(event) ? (
            <span className="mt-1 max-h-8 w-full overflow-hidden text-[10px] font-semibold leading-tight opacity-80">
              {formatYear(event.startYear)} - {formatYear(endYear)}
            </span>
          ) : null}
        </span>
      )}
    </button>
  );
}

function BackgroundRangeBar({
  event,
  backgroundLaneCount,
  trimStartHalf,
  trimEndHalf,
  viewStartYear,
  rowHeight,
  scrollTop,
  viewportHeight,
  trackLeft,
  laneWidth,
  onMouseMove,
  onMouseLeave,
  onClick
}: {
  event: PositionedTimelineEvent;
  backgroundLaneCount: number;
  trimStartHalf: boolean;
  trimEndHalf: boolean;
  viewStartYear: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  trackLeft: number;
  laneWidth: number;
  onMouseMove: (mouseEvent: MouseEvent<HTMLButtonElement>, timelineEvent: TimelineEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const endYear = getRangeEnd(event.startYear, event.endYear);
  const baseTop = yearToY(event.startYear, viewStartYear, rowHeight);
  const baseHeight = durationToHeight(event.startYear, endYear, rowHeight);
  const top = baseTop + (trimStartHalf ? rowHeight / 2 : 0);
  const height = Math.max(
    12,
    baseHeight - (trimStartHalf ? rowHeight / 2 : 0) - (trimEndHalf ? rowHeight / 2 : 0)
  );
  const width = BACKGROUND_BAR_WIDTH;
  const visualLaneIndex = Math.max(0, backgroundLaneCount - 1 - event.laneIndex);
  const left = trackLeft + visualLaneIndex * laneWidth;
  const showDateRange = shouldShowEventDateRange(event) || height >= 120;
  const labelHeight = showDateRange ? 54 : 26;
  const maxLabelOffset = Math.max(4, height - labelHeight - 4);
  const visibleTop = Math.max(top, scrollTop);
  const visibleBottom = Math.min(top + height, scrollTop + viewportHeight);
  const visibleMiddle = (visibleTop + visibleBottom) / 2;
  const labelOffset = clampNumber(visibleMiddle - top - labelHeight / 2, 4, maxLabelOffset);

  return (
    <button
      type="button"
      onMouseMove={(mouseEvent) => onMouseMove(mouseEvent, event)}
      onMouseLeave={onMouseLeave}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute overflow-hidden rounded-md border border-[#6f8fac]/75 bg-[#cfe0f1]/70 px-1 py-1 text-[11px] font-semibold text-[#284764] shadow-sm transition hover:border-[#3f668a] hover:bg-[#bdd4ea]/75"
      style={{
        top,
        left,
        width,
        height
      }}
      aria-label={`${event.title} ${rangeText(event)}`}
    >
      <span
        className="absolute left-1 right-1 flex flex-col items-center justify-center overflow-hidden text-center leading-tight"
        style={{ top: labelOffset, minHeight: labelHeight }}
      >
        <span className="max-h-full max-w-full overflow-hidden text-ellipsis font-bold" style={{ wordBreak: "break-all" }}>{event.title}</span>
        {showDateRange ? (
          <span className="mt-1 max-h-8 w-full overflow-hidden text-[10px] font-semibold opacity-80">
            {formatYear(event.startYear)} - {formatYear(endYear)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function EraRangeBar({
  era,
  eraLaneCount,
  trimStartHalf,
  trimEndHalf,
  viewStartYear,
  rowHeight,
  scrollTop,
  viewportHeight,
  trackLeft,
  laneWidth,
  onMouseMove,
  onMouseLeave,
  onClick
}: {
  era: PositionedTimelineEvent;
  eraLaneCount: number;
  trimStartHalf: boolean;
  trimEndHalf: boolean;
  viewStartYear: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  trackLeft: number;
  laneWidth: number;
  onMouseMove: (mouseEvent: MouseEvent<HTMLButtonElement>, timelineEvent: TimelineEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const endYear = getRangeEnd(era.startYear, era.endYear);
  const baseTop = yearToY(era.startYear, viewStartYear, rowHeight);
  const baseHeight = durationToHeight(era.startYear, endYear, rowHeight);
  const top = baseTop + (trimStartHalf ? rowHeight / 2 : 0);
  const height = Math.max(
    12,
    baseHeight - (trimStartHalf ? rowHeight / 2 : 0) - (trimEndHalf ? rowHeight / 2 : 0)
  );
  const width = ERA_BAR_WIDTH;
  const visualLaneIndex = Math.max(0, eraLaneCount - 1 - era.laneIndex);
  const left = trackLeft + visualLaneIndex * laneWidth;
  const isLongEra = height > viewportHeight * 0.66 || height >= 260;
  const canShowInlineLabel = height >= ERA_COMPACT_LABEL_HEIGHT + 10;
  const canShowDateRange = height >= ERA_FLOATING_LABEL_HEIGHT + 42 && width >= 92;
  const floatingLabelHeight = canShowDateRange ? ERA_FLOATING_LABEL_HEIGHT : ERA_COMPACT_LABEL_HEIGHT;
  const maxLabelOffset = Math.max(6, height - floatingLabelHeight - 6);
  const visibleEraTop = Math.max(top, scrollTop);
  const visibleEraBottom = Math.min(top + height, scrollTop + viewportHeight);
  const visibleEraMiddle = (visibleEraTop + visibleEraBottom) / 2;
  const preferredLabelOffset = visibleEraMiddle - top - floatingLabelHeight / 2;
  const labelOffset = clampNumber(preferredLabelOffset, 6, maxLabelOffset);
  const floatingLabelInset = 4;
  const floatingLabelWidth = Math.max(22, width - floatingLabelInset * 2);
  const compactVerticalLabel = width < 74;

  return (
    <button
      type="button"
      onMouseMove={(mouseEvent) => onMouseMove(mouseEvent, era)}
      onMouseLeave={onMouseLeave}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="group absolute overflow-hidden rounded-md border border-[#b9955f]/75 bg-[#dfc694]/30 px-1 py-3 text-sm font-semibold tracking-wide text-[#664b25] shadow-sm transition hover:border-[#8b6131] hover:bg-[#d4b476]/50"
      style={{
        top,
        left,
        width,
        height
      }}
      aria-label={`${era.title} ${rangeText(era)}`}
    >
      {isLongEra ? (
        <span
          className={clsx(
            "absolute z-20 flex items-center justify-center gap-2 px-1 text-center text-[#5d3f18]",
            compactVerticalLabel ? "text-sm" : "flex-col"
          )}
          style={{
            left: floatingLabelInset,
            top: labelOffset,
            width: floatingLabelWidth,
            minHeight: floatingLabelHeight,
            writingMode: compactVerticalLabel ? "vertical-rl" : "horizontal-tb",
            letterSpacing: "0.2em"
          }}
        >
          <span className="max-h-full max-w-full overflow-hidden text-ellipsis text-sm font-bold">
            {era.title}
          </span>
          {canShowDateRange ? (
            <span className="mt-2 max-h-8 w-full overflow-hidden text-xs font-semibold text-[#75572f]">
              {formatYear(era.startYear)} - {formatYear(endYear)}
            </span>
          ) : null}
        </span>
      ) : canShowInlineLabel ? (
        <span
          className="flex h-full w-full items-center justify-center overflow-hidden text-center"
          style={{
            writingMode: height > 90 ? "vertical-rl" : "horizontal-tb",
            letterSpacing: "0.2em"
          }}
        >
          {era.title}
        </span>
      ) : null}
    </button>
  );
}

function AnnotationBar({
  event,
  backgroundLaneCount,
  trimStartHalf,
  trimEndHalf,
  viewStartYear,
  rowHeight,
  scrollTop,
  viewportHeight,
  trackLeft,
  laneWidth,
  onMouseMove,
  onMouseLeave,
  onClick
}: {
  event: PositionedTimelineEvent;
  backgroundLaneCount: number;
  trimStartHalf: boolean;
  trimEndHalf: boolean;
  viewStartYear: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  trackLeft: number;
  laneWidth: number;
  onMouseMove: (mouseEvent: MouseEvent<HTMLButtonElement>, timelineEvent: TimelineEvent) => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const endYear = getRangeEnd(event.startYear, event.endYear);
  const baseTop = yearToY(event.startYear, viewStartYear, rowHeight);
  const baseHeight = durationToHeight(event.startYear, endYear, rowHeight);
  const top = baseTop + (trimStartHalf ? rowHeight / 2 : 0);
  const height = Math.max(
    12,
    baseHeight - (trimStartHalf ? rowHeight / 2 : 0) - (trimEndHalf ? rowHeight / 2 : 0)
  );
  const width = ANNOTATION_BAR_WIDTH;
  const visualLaneIndex = Math.max(0, backgroundLaneCount - 1 - event.laneIndex);
  const left = trackLeft + visualLaneIndex * laneWidth;
  const showDateRange = shouldShowEventDateRange(event) || height >= 120;
  const labelHeight = showDateRange ? 54 : 26;
  const maxLabelOffset = Math.max(4, height - labelHeight - 4);
  const visibleTop = Math.max(top, scrollTop);
  const visibleBottom = Math.min(top + height, scrollTop + viewportHeight);
  const visibleMiddle = (visibleTop + visibleBottom) / 2;
  const labelOffset = clampNumber(visibleMiddle - top - labelHeight / 2, 4, maxLabelOffset);

  return (
    <button
      type="button"
      onMouseMove={(mouseEvent) => onMouseMove(mouseEvent, event)}
      onMouseLeave={onMouseLeave}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute overflow-hidden rounded-md border border-[#c7a66e]/60 bg-[#e8d8b8]/60 px-1 py-1 text-xs font-medium text-[#7a5e38] shadow-sm transition hover:border-[#8b6131] hover:bg-[#dfc5a0]/70"
      style={{
        top,
        left,
        width,
        height
      }}
      aria-label={`${event.title} ${rangeText(event)}`}
    >
      <span
        className="absolute left-1 right-1 flex flex-col items-center justify-center overflow-hidden text-center leading-tight"
        style={{ top: labelOffset, minHeight: labelHeight }}
      >
        <span className="max-h-full max-w-full overflow-hidden text-ellipsis font-semibold text-xs" style={{ wordBreak: "break-all" }}>{event.title}</span>
        {showDateRange ? (
          <span className="mt-1 max-h-8 w-full overflow-hidden text-[10px] font-medium opacity-80">
            {formatYear(event.startYear)} - {formatYear(endYear)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function EventDetailDrawer({
  event,
  onClose,
  isAdmin,
  onEdit,
  onDeleted
}: {
  event: TimelineEvent | null;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (event: TimelineEvent) => void;
  onDeleted?: () => void;
}) {
  const eventImage = getEventImage(event);

  return (
    <aside
      className={clsx(
        "fixed right-0 top-10 z-[90] h-[calc(100vh-40px)] w-[420px] max-w-[92vw] border-l border-[#c8aa78] bg-[#fff7e8] p-5 shadow-2xl transition-transform duration-300",
        event ? "translate-x-0" : "translate-x-full"
      )}
      aria-hidden={!event}
    >
      {event ? (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-[#ead8b8] px-3 py-1 text-xs font-semibold text-[#654920]">
                  {CATEGORY_LABELS[event.category]}
                </div>
                <h2 className="text-2xl font-semibold text-[#2f2a22]">{event.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit?.(event)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c9ad7d] text-[#684b24] transition hover:bg-[#ead8b8]"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleted?.()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#b75f4b]/50 text-[#b75f4b] transition hover:bg-[#b75f4b]/10"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭详情"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d0b384] text-[#684b24] transition hover:bg-[#ead8b8]"
                >
                  <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {eventImage ? (
              <a
                href={eventImage.src}
                target="_blank"
                rel="noreferrer"
                aria-label={`打开${event.title}原图`}
                className="mb-5 block overflow-hidden rounded-lg border border-[#d7bb88] bg-[#ead8b8] transition hover:border-[#a97f45] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#8b6131]/25"
              >
                <Image
                  src={eventImage.src}
                  alt={eventImage.alt}
                  width={1200}
                  height={675}
                  className="aspect-video w-full object-cover transition duration-200 hover:scale-[1.015]"
                />
              </a>
            ) : null}

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-[#7d633f]">时间范围</dt>
                <dd className="mt-1 text-[#342719]">{rangeText(event)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#7d633f]">分类</dt>
                <dd className="mt-1 text-[#342719]">{CATEGORY_LABELS[event.category]}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#7d633f]">简介</dt>
                <dd className="mt-1 leading-7 text-[#342719]">{event.summary}</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d0b384] text-sm font-semibold text-[#684b24] transition hover:bg-[#ead8b8]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            关闭
          </button>
        </div>
      ) : null}
    </aside>
  );
}
