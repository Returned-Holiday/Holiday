const NEW_BADGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMonthDay(value: string): string {
  const date = parseDate(value);
  if (date === null) {
    return "";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day}`;
}

export function formatFullDate(value: string | null): string | null {
  const date = value === null ? null : parseDate(value);
  if (date === null) {
    return null;
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

export function formatCount(value: number | null): string | null {
  return value === null ? null : `${value.toLocaleString("ko-KR")}명`;
}

export function isRecentlyNotified(value: string, now: Date = new Date()): boolean {
  const date = parseDate(value);
  if (date === null) {
    return false;
  }
  const elapsed = now.getTime() - date.getTime();
  return elapsed >= 0 && elapsed < NEW_BADGE_DAYS * DAY_MS;
}

export function incidentTitle(companyName: string): string {
  return `${companyName} 개인정보 유출 사고`;
}
