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
