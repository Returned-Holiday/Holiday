import { isRecord } from "../../shared/lib/guards";

export type Certainty = "CERTAIN" | "CHECK_NEEDED";

export type ChecklistAction = {
  id: number;
  priority: number;
  title: string;
  summary: string | null;
  steps: string;
  sourceUrl: string | null;
  reason: string;
  certainty: Certainty;
  isNew: boolean;
  completed: boolean;
};

export type Checklist = {
  incidentId: number;
  companyName: string;
  sourceUrl: string;
  contactInfo: string | null;
  noticeRevised: boolean;
  leakItemsUnknown: boolean;
  completedCount: number;
  totalCount: number;
  actions: ChecklistAction[];
};

const isNullableString = (value: unknown) => value === null || typeof value === "string";

function isChecklistAction(value: unknown): value is ChecklistAction {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.priority === "number" &&
    typeof value.title === "string" &&
    isNullableString(value.summary) &&
    typeof value.steps === "string" &&
    isNullableString(value.sourceUrl) &&
    typeof value.reason === "string" &&
    (value.certainty === "CERTAIN" || value.certainty === "CHECK_NEEDED") &&
    typeof value.isNew === "boolean" &&
    typeof value.completed === "boolean"
  );
}

export function isChecklist(value: unknown): value is Checklist {
  return (
    isRecord(value) &&
    typeof value.incidentId === "number" &&
    typeof value.companyName === "string" &&
    typeof value.sourceUrl === "string" &&
    isNullableString(value.contactInfo) &&
    typeof value.noticeRevised === "boolean" &&
    typeof value.leakItemsUnknown === "boolean" &&
    typeof value.completedCount === "number" &&
    typeof value.totalCount === "number" &&
    Array.isArray(value.actions) &&
    value.actions.every(isChecklistAction)
  );
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: "금전 피해 차단",
  2: "인증 수단 보호",
  3: "진행 중인 공격 대응",
  4: "연쇄 피해 예방",
  5: "장기적 도용 예방",
};

export const URGENT_MAX_PRIORITY = 3;
