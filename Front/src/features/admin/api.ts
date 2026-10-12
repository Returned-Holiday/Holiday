import { apiClient } from "../../shared/api/client";
import { isRecord, readPaginated, type Paginated } from "../../shared/lib/guards";

// 관리자 화면 전용 (lazy 청크에만 포함)
export type PublishStatus = "PUBLIC" | "PRIVATE";
export type ResponseStatus = "ONGOING" | "CLOSED";

export const LEAK_TYPES = [
  { value: "CONTACT", label: "연락처" },
  { value: "ACCOUNT", label: "계정정보" },
  { value: "RESIDENT_NUMBER", label: "주민등록번호" },
  { value: "FINANCIAL", label: "금융정보" },
  { value: "LOCATION", label: "위치정보" },
  { value: "AUTH_FACTOR", label: "인증수단 정보" },
  { value: "OTHER", label: "기타" },
] as const;
export type LeakType = (typeof LEAK_TYPES)[number]["value"];

export const SURVEY_KEYS = [
  { value: "PAYMENT_LINKED", label: "설문 2번 · 결제수단 등록" },
  { value: "REUSED_PASSWORD", label: "설문 3번 · 비밀번호 재사용" },
  { value: "IMPERSONATION_CONTACT", label: "설문 4번 · 사칭 연락" },
  { value: "DAMAGE_OCCURRED", label: "설문 5번 · 피해 발생" },
] as const;
export type SurveyKey = (typeof SURVEY_KEYS)[number]["value"];

const isString = (value: unknown): value is string => typeof value === "string";
const isNullableString = (value: unknown) => value === null || typeof value === "string";
const isNullableNumber = (value: unknown) => value === null || typeof value === "number";
const isPublish = (value: unknown): value is PublishStatus => value === "PUBLIC" || value === "PRIVATE";
const isLeakType = (value: unknown): value is LeakType => LEAK_TYPES.some((type) => type.value === value);
const isSurveyKey = (value: unknown): value is SurveyKey => SURVEY_KEYS.some((key) => key.value === value);

function readData<T>(body: unknown, guard: (value: unknown) => value is T): T {
  if (!isRecord(body) || !guard(body.data)) {
    throw new TypeError("unexpected admin response");
  }
  return body.data;
}

// OTP
export async function verifyOtp(code: string): Promise<void> {
  await apiClient.post("/auth/otp/", { code });
}

// 사고
export type AdminIncidentRow = {
  id: number;
  companyName: string;
  notifiedAt: string;
  leakItemCount: number;
  status: PublishStatus;
  responseStatus: ResponseStatus;
};

function isIncidentRow(value: unknown): value is AdminIncidentRow {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isString(value.companyName) &&
    isString(value.notifiedAt) &&
    typeof value.leakItemCount === "number" &&
    isPublish(value.status) &&
    (value.responseStatus === "ONGOING" || value.responseStatus === "CLOSED")
  );
}

export async function fetchAdminIncidents(
  params: { q?: string; status?: PublishStatus; page?: number },
  signal?: AbortSignal,
): Promise<Paginated<AdminIncidentRow>> {
  const response = await apiClient.get<unknown>("/admin/incidents/", { params, signal });
  return readPaginated(response.data, isIncidentRow);
}

export type AdminLeakItem = {
  id: number;
  label: string;
  isLeaked: boolean;
  leakType: LeakType;
  selectedByUsers: boolean;
};

export type AdminIncident = {
  id: number;
  companyId: number;
  occurredAt: string | null;
  notifiedAt: string;
  affectedCount: number | null;
  sourceUrl: string;
  contactInfo: string | null;
  summary: string;
  status: PublishStatus;
  responseStatus: ResponseStatus;
  leakItems: AdminLeakItem[];
};

function isAdminLeakItem(value: unknown): value is AdminLeakItem {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isString(value.label) &&
    typeof value.isLeaked === "boolean" &&
    isLeakType(value.leakType) &&
    typeof value.selectedByUsers === "boolean"
  );
}

function isAdminIncident(value: unknown): value is AdminIncident {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.companyId === "number" &&
    isNullableString(value.occurredAt) &&
    isString(value.notifiedAt) &&
    isNullableNumber(value.affectedCount) &&
    isString(value.sourceUrl) &&
    isNullableString(value.contactInfo) &&
    isString(value.summary) &&
    isPublish(value.status) &&
    (value.responseStatus === "ONGOING" || value.responseStatus === "CLOSED") &&
    Array.isArray(value.leakItems) &&
    value.leakItems.every(isAdminLeakItem)
  );
}

export async function fetchAdminIncident(id: number, signal?: AbortSignal): Promise<AdminIncident> {
  const response = await apiClient.get<unknown>(`/admin/incidents/${id}/`, { signal });
  return readData(response.data, isAdminIncident);
}

export type IncidentInput = Omit<AdminIncident, "id" | "leakItems">;

export async function createAdminIncident(input: IncidentInput): Promise<AdminIncident> {
  const response = await apiClient.post<unknown>("/admin/incidents/", input);
  return readData(response.data, isAdminIncident);
}

export async function updateAdminIncident(id: number, input: Partial<IncidentInput>): Promise<AdminIncident> {
  const response = await apiClient.patch<unknown>(`/admin/incidents/${id}/`, input);
  return readData(response.data, isAdminIncident);
}

export type LeakItemInput = { label: string; isLeaked: boolean; leakType: LeakType };

export async function addLeakItem(incidentId: number, input: LeakItemInput): Promise<void> {
  await apiClient.post(`/admin/incidents/${incidentId}/leak-items/`, input);
}

export async function updateLeakItem(incidentId: number, itemId: number, input: LeakItemInput): Promise<void> {
  await apiClient.patch(`/admin/incidents/${incidentId}/leak-items/${itemId}/`, input);
}

export async function deleteLeakItem(incidentId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/admin/incidents/${incidentId}/leak-items/${itemId}/`);
}

// 기업
export type Company = { id: number; name: string; aliases: string[] };

function isCompany(value: unknown): value is Company {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isString(value.name) &&
    Array.isArray(value.aliases) &&
    value.aliases.every(isString)
  );
}

export async function fetchCompanies(signal?: AbortSignal): Promise<Company[]> {
  const response = await apiClient.get<unknown>("/admin/incidents/companies/", { signal });
  return readPaginated(response.data, isCompany).results;
}

export async function saveCompany(input: Omit<Company, "id">, id?: number): Promise<void> {
  if (id === undefined) {
    await apiClient.post("/admin/incidents/companies/", input);
  } else {
    await apiClient.patch(`/admin/incidents/companies/${id}/`, input);
  }
}

// 조치
export type TriggerType = "LEAK_TYPE" | "SURVEY" | "ALWAYS";

export type AdminAction = {
  id: number;
  incidentId: number | null;
  triggerType: TriggerType;
  leakType: LeakType | null;
  surveyKey: SurveyKey | null;
  priority: number;
  title: string;
  steps: string;
  sourceUrl: string | null;
  status: PublishStatus;
};

function isAdminAction(value: unknown): value is AdminAction {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isNullableNumber(value.incidentId) &&
    (value.triggerType === "LEAK_TYPE" || value.triggerType === "SURVEY" || value.triggerType === "ALWAYS") &&
    (value.leakType === null || isLeakType(value.leakType)) &&
    (value.surveyKey === null || isSurveyKey(value.surveyKey)) &&
    typeof value.priority === "number" &&
    isString(value.title) &&
    isString(value.steps) &&
    isNullableString(value.sourceUrl) &&
    isPublish(value.status)
  );
}

export async function fetchActions(signal?: AbortSignal): Promise<AdminAction[]> {
  const response = await apiClient.get<unknown>("/admin/guides/actions/", { signal });
  return readPaginated(response.data, isAdminAction).results;
}

export async function saveAction(input: Omit<AdminAction, "id">, id?: number): Promise<void> {
  if (id === undefined) {
    await apiClient.post("/admin/guides/actions/", input);
  } else {
    await apiClient.patch(`/admin/guides/actions/${id}/`, input);
  }
}

// 제보 검수
export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminReportRow = {
  id: number;
  companyName: string;
  reporterNickname: string;
  createdAt: string;
  status: ReportStatus;
};

export type AdminReport = AdminReportRow & {
  sourceUrl: string;
  notifiedAt: string | null;
  leakItemsText: string;
  rejectReason: string | null;
};

const isReportStatus = (value: unknown): value is ReportStatus =>
  value === "PENDING" || value === "APPROVED" || value === "REJECTED";

function isReportRow(value: unknown): value is AdminReportRow {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isString(value.companyName) &&
    isString(value.reporterNickname) &&
    isString(value.createdAt) &&
    isReportStatus(value.status)
  );
}

function isAdminReport(value: unknown): value is AdminReport {
  return (
    isRecord(value) &&
    isString(value.sourceUrl) &&
    isNullableString(value.notifiedAt) &&
    isString(value.leakItemsText) &&
    isNullableString(value.rejectReason) &&
    isReportRow(value)
  );
}

export async function fetchAdminReports(status: ReportStatus, signal?: AbortSignal): Promise<Paginated<AdminReportRow>> {
  const response = await apiClient.get<unknown>("/admin/reports/", { params: { status }, signal });
  return readPaginated(response.data, isReportRow);
}

export async function fetchAdminReport(id: number, signal?: AbortSignal): Promise<AdminReport> {
  const response = await apiClient.get<unknown>(`/admin/reports/${id}/`, { signal });
  return readData(response.data, isAdminReport);
}

export async function approveReport(id: number, incidentId: number | null): Promise<void> {
  await apiClient.post(`/admin/reports/${id}/approve/`, { incidentId });
}

export async function rejectReport(id: number, reason: string): Promise<void> {
  await apiClient.post(`/admin/reports/${id}/reject/`, { reason });
}
