import { apiClient } from "../../shared/api/client";
import { isRecord } from "../../shared/lib/guards";
import { isChecklist, type Checklist } from "./types";

export async function fetchChecklist(incidentId: number, signal?: AbortSignal): Promise<Checklist> {
  const response = await apiClient.get<unknown>(`/guides/incidents/${incidentId}/checklist/`, { signal });
  const body = response.data;
  if (!isRecord(body) || !isChecklist(body.data)) {
    throw new TypeError("unexpected checklist response");
  }
  return body.data;
}

export async function setCompletion(incidentId: number, actionId: number, completed: boolean): Promise<void> {
  const url = `/guides/incidents/${incidentId}/completions/${actionId}/`;
  if (completed) {
    await apiClient.put(url);
  } else {
    await apiClient.delete(url);
  }
}
