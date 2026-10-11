import { isAxiosError } from "axios";

export const GENERIC_ERROR_MESSAGE = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const NETWORK_ERROR_MESSAGE = "서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.";

type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly fields: FieldErrors;

  constructor(code: string, message: string, status: number | null, fields: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) {
    return {};
  }
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages) && messages.every((message) => typeof message === "string")) {
      result[field] = messages;
    }
  }
  return result;
}

// 형식 외 에러는 일반 문구로 (내부 정보 노출 방지)
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (!isAxiosError(error)) {
    return new ApiError("UNKNOWN_ERROR", GENERIC_ERROR_MESSAGE, null);
  }
  const response = error.response;
  if (response === undefined) {
    return new ApiError("NETWORK_ERROR", NETWORK_ERROR_MESSAGE, null);
  }
  const body: unknown = response.data;
  if (isRecord(body) && typeof body.code === "string" && typeof body.message === "string") {
    return new ApiError(body.code, body.message, response.status, readFieldErrors(body.fields));
  }
  return new ApiError("UNKNOWN_ERROR", GENERIC_ERROR_MESSAGE, response.status);
}
