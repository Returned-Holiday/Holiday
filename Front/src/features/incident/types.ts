import { isRecord } from "../../shared/lib/guards";

export type IncidentListItem = {
  id: number;
  companyName: string;
  notifiedAt: string;
};

export function isIncidentListItem(value: unknown): value is IncidentListItem {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.companyName === "string" &&
    typeof value.notifiedAt === "string"
  );
}

export type ResponseStatus = "ONGOING" | "CLOSED";

export type LeakItem = {
  id: number;
  label: string;
  isLeaked: boolean;
};

export type IncidentDetail = IncidentListItem & {
  occurredAt: string | null;
  affectedCount: number | null;
  summary: string;
  sourceUrl: string;
  contactInfo: string | null;
  responseStatus: ResponseStatus;
  leakItems: LeakItem[];
};

function isLeakItem(value: unknown): value is LeakItem {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.label === "string" &&
    typeof value.isLeaked === "boolean"
  );
}

const isNullableString = (value: unknown) => value === null || typeof value === "string";

export function isIncidentDetail(value: unknown): value is IncidentDetail {
  return (
    isRecord(value) &&
    isNullableString(value.occurredAt) &&
    (value.affectedCount === null || typeof value.affectedCount === "number") &&
    typeof value.summary === "string" &&
    typeof value.sourceUrl === "string" &&
    isNullableString(value.contactInfo) &&
    (value.responseStatus === "ONGOING" || value.responseStatus === "CLOSED") &&
    Array.isArray(value.leakItems) &&
    value.leakItems.every(isLeakItem) &&
    isIncidentListItem(value)
  );
}
