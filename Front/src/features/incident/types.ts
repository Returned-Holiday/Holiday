import { isRecord } from "../../shared/lib/guards";

export type ResponseStatus = "ONGOING" | "CLOSED";

type IncidentBase = {
  id: number;
  companyName: string;
  notifiedAt: string;
  responseStatus: ResponseStatus;
};

function isIncidentBase(value: unknown): value is IncidentBase {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.companyName === "string" &&
    typeof value.notifiedAt === "string" &&
    (value.responseStatus === "ONGOING" || value.responseStatus === "CLOSED")
  );
}

export type IncidentListItem = IncidentBase & {
  leakedLabels: string[];
};

export function isIncidentListItem(value: unknown): value is IncidentListItem {
  return (
    isRecord(value) &&
    Array.isArray(value.leakedLabels) &&
    value.leakedLabels.every((label) => typeof label === "string") &&
    isIncidentBase(value)
  );
}

export type LeakItem = {
  id: number;
  label: string;
  isLeaked: boolean;
};

export type IncidentDetail = IncidentBase & {
  occurredAt: string | null;
  affectedCount: number | null;
  summary: string;
  sourceUrl: string;
  contactInfo: string | null;
  activeCount: number;
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
    typeof value.activeCount === "number" &&
    Array.isArray(value.leakItems) &&
    value.leakItems.every(isLeakItem) &&
    isIncidentBase(value)
  );
}
