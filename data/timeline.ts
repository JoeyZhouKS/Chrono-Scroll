import timelineEventImages from "@/data/timeline-event-images.json";
import timelineEvents from "@/data/timeline-events.json";
import type { TimelineEvent, TimelineEventImage } from "@/data/timelineTypes";

export type {
  EventCategory,
  EventRail,
  TimelineEvent,
  TimelineEventImage
} from "@/data/timelineTypes";

export const TIMELINE_EVENTS = timelineEvents as TimelineEvent[];

export const TIMELINE_EVENT_IMAGES = timelineEventImages as Record<string, TimelineEventImage>;
