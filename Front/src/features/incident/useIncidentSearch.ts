import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";
import type { Paginated } from "../../shared/lib/guards";
import { fetchIncidents } from "./api";
import type { IncidentListItem } from "./types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; page: Paginated<IncidentListItem> };

const LOAD_FAILED_MESSAGE = "검색 결과를 불러오지 못했어요.";

export function parsePageNumber(value: string | null): number {
  if (value === null || !/^[1-9]\d{0,4}$/.test(value)) {
    return 1;
  }
  return Number(value);
}

export function useIncidentSearch(q: string, page: number) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchIncidents({ q, page, signal: controller.signal })
      .then((result) => setState({ status: "success", page: result }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof ApiError || error instanceof TypeError) {
          setState({ status: "error", message: LOAD_FAILED_MESSAGE });
          return;
        }
        throw error;
      });
    return () => controller.abort();
  }, [q, page, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, retry };
}
