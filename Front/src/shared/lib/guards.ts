export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// 응답 형식 검사 후 사용 (형식 외 → 예외). 목록도 { data: { count, ... } }
export function readPaginated<T>(body: unknown, isItem: (item: unknown) => item is T): Paginated<T> {
  const value = isRecord(body) ? body.data : undefined;
  if (
    !isRecord(value) ||
    typeof value.count !== "number" ||
    !Array.isArray(value.results) ||
    !value.results.every(isItem)
  ) {
    throw new TypeError("unexpected list response");
  }
  return {
    count: value.count,
    next: typeof value.next === "string" ? value.next : null,
    previous: typeof value.previous === "string" ? value.previous : null,
    results: value.results,
  };
}
