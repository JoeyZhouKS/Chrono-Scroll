import type { TimelineEvent } from "@/data/timeline";
import { getRangeEnd, yearToIndex } from "@/lib/yearUtils";

export const LANE_WIDTH = 110;

type LaneAssignmentOptions = {
  allowSharedBoundary?: boolean;
  preferExactBoundaryLane?: boolean;
  preferLastAvailableLane?: boolean;
};

export type PositionedTimelineEvent = TimelineEvent & {
  laneIndex: number;
  startIndex: number;
  endIndex: number;
};

export function assignEventLanes(
  events: TimelineEvent[],
  options: LaneAssignmentOptions = {}
): PositionedTimelineEvent[] {
  const {
    allowSharedBoundary = false,
    preferExactBoundaryLane = false,
    preferLastAvailableLane = false
  } = options;
  const laneEndIndexes: number[] = [];

  return [...events]
    .sort((a, b) => {
      const startDiff = yearToIndex(a.startYear) - yearToIndex(b.startYear);
      if (startDiff !== 0) return startDiff;

      return yearToIndex(getRangeEnd(a.startYear, a.endYear)) - yearToIndex(getRangeEnd(b.startYear, b.endYear));
    })
    .map((event) => {
      const startIndex = yearToIndex(event.startYear);
      const endIndex = yearToIndex(getRangeEnd(event.startYear, event.endYear));
      const isLaneAvailable = (laneEndIndex: number) =>
        allowSharedBoundary ? startIndex >= laneEndIndex : startIndex > laneEndIndex;
      const availableLaneIndexes = laneEndIndexes
        .map((laneEndIndex, index) => ({ laneEndIndex, index }))
        .filter(({ laneEndIndex }) => isLaneAvailable(laneEndIndex))
        .map(({ index }) => index);

      let laneIndex = -1;
      if (availableLaneIndexes.length > 0) {
        if (allowSharedBoundary && preferExactBoundaryLane) {
          const exactBoundaryLane = availableLaneIndexes.find(
            (index) => laneEndIndexes[index] === startIndex
          );
          laneIndex = exactBoundaryLane ?? availableLaneIndexes[availableLaneIndexes.length - 1];
        } else if (preferLastAvailableLane) {
          laneIndex = availableLaneIndexes[availableLaneIndexes.length - 1];
        } else {
          laneIndex = availableLaneIndexes[0];
        }
      }

      if (laneIndex === -1) {
        laneIndex = laneEndIndexes.length;
        laneEndIndexes.push(endIndex);
      } else {
        laneEndIndexes[laneIndex] = endIndex;
      }

      return {
        ...event,
        laneIndex,
        startIndex,
        endIndex
      };
    });
}
