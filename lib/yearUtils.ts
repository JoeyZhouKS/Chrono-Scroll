function assertHistoricalYear(year: number, caller: string) {
  if (!Number.isInteger(year) || year === 0) {
    throw new Error(`${caller} received an invalid historical year: ${year}`);
  }
}

export function formatYear(year: number): string {
  assertHistoricalYear(year, "formatYear");

  if (year < 0) {
    return `公元前${Math.abs(year)}年`;
  }

  return `${year}年`;
}

export function yearToIndex(year: number): number {
  assertHistoricalYear(year, "yearToIndex");

  return year < 0 ? year : year - 1;
}

export function indexToYear(index: number): number {
  if (!Number.isInteger(index)) {
    throw new Error(`indexToYear received an invalid index: ${index}`);
  }

  return index < 0 ? index : index + 1;
}

export function yearsBetween(startYear: number, endYear: number): number {
  assertHistoricalYear(startYear, "yearsBetween");
  assertHistoricalYear(endYear, "yearsBetween");

  const startIndex = yearToIndex(startYear);
  const endIndex = yearToIndex(endYear);

  if (startIndex > endIndex) {
    throw new Error(`yearsBetween requires startYear <= endYear: ${startYear}, ${endYear}`);
  }

  return endIndex - startIndex + 1;
}

export function yearToY(year: number, viewStartYear: number, rowHeight: number): number {
  assertHistoricalYear(year, "yearToY");
  assertHistoricalYear(viewStartYear, "yearToY");

  return (yearToIndex(year) - yearToIndex(viewStartYear)) * rowHeight;
}

export function durationToHeight(startYear: number, endYear: number, rowHeight: number): number {
  assertHistoricalYear(startYear, "durationToHeight");
  assertHistoricalYear(endYear, "durationToHeight");

  return yearsBetween(startYear, endYear) * rowHeight;
}

export function isValidHistoricalYear(year: number): boolean {
  return Number.isInteger(year) && year !== 0;
}

export function compareYears(a: number, b: number): number {
  return yearToIndex(a) - yearToIndex(b);
}

export function getRangeEnd(startYear: number, endYear?: number): number {
  return endYear ?? startYear;
}

export function rangesOverlap(
  aStartYear: number,
  aEndYear: number,
  bStartYear: number,
  bEndYear: number
): boolean {
  const aStart = yearToIndex(aStartYear);
  const aEnd = yearToIndex(aEndYear);
  const bStart = yearToIndex(bStartYear);
  const bEnd = yearToIndex(bEndYear);

  return aStart <= bEnd && bStart <= aEnd;
}

export function clampYearToRange(year: number, startYear: number, endYear: number): number {
  const yearIndex = yearToIndex(year);
  const startIndex = yearToIndex(startYear);
  const endIndex = yearToIndex(endYear);

  if (yearIndex < startIndex) return startYear;
  if (yearIndex > endIndex) return endYear;

  return year;
}
