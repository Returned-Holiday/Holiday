import { apiClient } from "../../shared/api/client";
import { isRecord } from "../../shared/lib/guards";

export type MyIncident = {
  incidentId: number;
  companyName: string;
  completedCount: number;
  totalCount: number;
  urgentRemaining: number;
  nextUrgentTitle: string | null;
};

function isMyIncident(value: unknown): value is MyIncident {
  return (
    isRecord(value) &&
    typeof value.incidentId === "number" &&
    typeof value.companyName === "string" &&
    typeof value.completedCount === "number" &&
    typeof value.totalCount === "number" &&
    typeof value.urgentRemaining === "number" &&
    (value.nextUrgentTitle === null || typeof value.nextUrgentTitle === "string")
  );
}

export async function fetchMyIncidents(signal?: AbortSignal): Promise<MyIncident[]> {
  const response = await apiClient.get<unknown>("/mypage/", { signal });
  const body = response.data;
  if (!isRecord(body) || !isRecord(body.data) || !Array.isArray(body.data.incidents)) {
    throw new TypeError("unexpected mypage response");
  }
  const incidents: unknown[] = body.data.incidents;
  if (!incidents.every(isMyIncident)) {
    throw new TypeError("unexpected mypage response");
  }
  return incidents;
}

export async function withdraw(currentPassword: string): Promise<void> {
  await apiClient.post("/auth/withdraw/", { currentPassword });
}
