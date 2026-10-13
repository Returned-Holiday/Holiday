import { apiClient } from "../../shared/api/client";
import { isRecord } from "../../shared/lib/guards";
import { isSurveyAnswers, type SurveyAnswers } from "./types";

const surveyUrl = (incidentId: number) => `/guides/incidents/${incidentId}/survey/`;

export async function fetchSurvey(incidentId: number, signal?: AbortSignal): Promise<SurveyAnswers | null> {
  const response = await apiClient.get<unknown>(surveyUrl(incidentId), { signal });
  const body = response.data;
  if (!isRecord(body)) {
    throw new TypeError("unexpected survey response");
  }
  if (body.data === null) {
    return null;
  }
  if (!isSurveyAnswers(body.data)) {
    throw new TypeError("unexpected survey response");
  }
  return body.data;
}

export async function saveSurvey(incidentId: number, answers: SurveyAnswers): Promise<void> {
  // 잘 모르겠어요·해당 없음 → 선택 항목 비움 (서버도 함께 오면 400)
  const selectedItemIds = answers.leakItemsAnswer === "SELECTED" ? answers.selectedItemIds : [];
  await apiClient.put(surveyUrl(incidentId), { ...answers, selectedItemIds });
}

export async function deleteSurvey(incidentId: number): Promise<void> {
  await apiClient.delete(surveyUrl(incidentId));
}
