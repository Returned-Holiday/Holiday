import { useState } from "react";
import { ApiError, GENERIC_ERROR_MESSAGE } from "../../shared/api/errors";
import { OCR_ACCEPT, OCR_MAX_BYTES, recognizeNotice, type OcrMatch } from "./api";

type State =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "matched"; result: OcrMatch & { incident: NonNullable<OcrMatch["incident"]> } }
  | { status: "unmatched" }
  | { status: "error"; message: string };

const MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE: "5MB 이하 이미지만 올릴 수 있어요.",
  UNSUPPORTED_FILE: "JPG·PNG 이미지만 올릴 수 있어요.",
  RATE_LIMITED: "1시간에 10번까지 올릴 수 있어요. 잠시 후 다시 시도해 주세요.",
};

// 형식·크기 검사는 사용성용 (서버가 시그니처까지 재검증)
function precheck(file: File): string | null {
  if (!OCR_ACCEPT.includes(file.type)) {
    return MESSAGES.UNSUPPORTED_FILE ?? GENERIC_ERROR_MESSAGE;
  }
  if (file.size > OCR_MAX_BYTES) {
    return MESSAGES.FILE_TOO_LARGE ?? GENERIC_ERROR_MESSAGE;
  }
  return null;
}

export function useOcrUpload() {
  const [state, setState] = useState<State>({ status: "idle" });

  const upload = async (file: File) => {
    const problem = precheck(file);
    if (problem !== null) {
      setState({ status: "error", message: problem });
      return;
    }
    setState({ status: "uploading" });
    try {
      const result = await recognizeNotice(file);
      if (result.incident === null) {
        setState({ status: "unmatched" });
        return;
      }
      setState({ status: "matched", result: { ...result, incident: result.incident } });
    } catch (error) {
      if (error instanceof ApiError) {
        setState({ status: "error", message: MESSAGES[error.code] ?? error.message });
        return;
      }
      if (error instanceof TypeError) {
        setState({ status: "error", message: GENERIC_ERROR_MESSAGE });
        return;
      }
      throw error;
    }
  };

  const reset = () => setState({ status: "idle" });

  return { state, upload, reset };
}
