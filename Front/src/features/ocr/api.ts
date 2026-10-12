import { apiClient } from "../../shared/api/client";
import { isRecord } from "../../shared/lib/guards";

export const OCR_MAX_BYTES = 5 * 1024 * 1024;
export const OCR_ACCEPT = ["image/jpeg", "image/png"];

export type OcrMatch = {
  incident: { id: number; companyName: string } | null;
  matchedItems: { id: number; label: string }[];
};

function isOcrMatch(value: unknown): value is OcrMatch {
  if (!isRecord(value) || !Array.isArray(value.matchedItems)) {
    return false;
  }
  const incident = value.incident;
  const incidentOk =
    incident === null ||
    (isRecord(incident) && typeof incident.id === "number" && typeof incident.companyName === "string");
  return (
    incidentOk &&
    value.matchedItems.every(
      (item) => isRecord(item) && typeof item.id === "number" && typeof item.label === "string",
    )
  );
}

// 응답은 DB의 사고·항목만 (인식 원문 X)
export async function recognizeNotice(file: File): Promise<OcrMatch> {
  const form = new FormData();
  form.append("image", file);
  const response = await apiClient.post<unknown>("/guides/ocr/", form, {
    timeout: 30_000,
  });
  const body = response.data;
  if (!isRecord(body) || !isOcrMatch(body.data)) {
    throw new TypeError("unexpected ocr response");
  }
  return body.data;
}
