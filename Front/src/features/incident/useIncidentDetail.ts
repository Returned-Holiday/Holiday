import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";
import { fetchIncidentDetail } from "./api";
import type { IncidentDetail } from "./types";

type State =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "success"; incident: IncidentDetail };

const LOAD_FAILED_MESSAGE = "사고 정보를 불러오지 못했어요.";

// 숫자 ID만 요청 (그 외 → 바로 404 화면)
export function parseIncidentId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d{0,17}$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function useIncidentDetail(incidentId: number | null) {
  const [state, setState] = useState<State>(
    incidentId === null ? { status: "notFound" } : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (incidentId === null) {
      setState({ status: "notFound" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchIncidentDetail(incidentId, controller.signal)
      .then((incident) => setState({ status: "success", incident }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        // 비공개·없는 사고 구분 없이 404
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "notFound" });
          return;
        }
        if (error instanceof ApiError || error instanceof TypeError) {
          setState({ status: "error", message: LOAD_FAILED_MESSAGE });
          return;
        }
        throw error;
      });
    return () => controller.abort();
  }, [incidentId, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, retry };
}
