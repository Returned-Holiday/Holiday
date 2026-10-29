import { apiClient } from "../../shared/api/client";
import { isRecord, readPaginated, type Paginated } from "../../shared/lib/guards";

export const COMPANY_NAME_MAX = 100;
export const SOURCE_URL_MAX = 500;
export const LEAK_ITEMS_MAX = 1000;

export type ReportInput = {
  companyName: string;
  sourceUrl: string;
  notifiedAt: string | null;
  leakItemsText: string;
};

export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MyReport = {
  id: number;
  companyName: string;
  createdAt: string;
  status: ReportStatus;
  rejectReason: string | null;
  reviewedAt: string | null;
};

function isMyReport(value: unknown): value is MyReport {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.companyName === "string" &&
    typeof value.createdAt === "string" &&
    (value.status === "PENDING" || value.status === "APPROVED" || value.status === "REJECTED") &&
    (value.rejectReason === null || typeof value.rejectReason === "string") &&
    (value.reviewedAt === null || typeof value.reviewedAt === "string")
  );
}

export async function createReport(input: ReportInput): Promise<void> {
  await apiClient.post("/reports/", input);
}

export async function fetchMyReports(signal?: AbortSignal): Promise<Paginated<MyReport>> {
  const response = await apiClient.get<unknown>("/reports/", { signal });
  return readPaginated(response.data, isMyReport);
}
