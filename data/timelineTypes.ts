export type EventCategory =
  | "era"
  | "dynasty"
  | "war"
  | "politics"
  | "culture"
  | "technology"
  | "revolution"
  | "diplomacy"
  | "economy"
  | "society";

export type EventRail = "main" | "global_long";

export type TimelineEvent = {
  id: string;
  title: string;
  startYear: number;
  endYear?: number;
  type: "event" | "era";
  category: EventCategory;
  rail?: EventRail;
  summary: string;
};

export type TimelineEventImage = {
  src: string;
  alt: string;
};
