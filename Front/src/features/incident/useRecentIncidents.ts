import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";
import { fetchIncidents } from "./api";
import type { IncidentListItem } from "./types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: IncidentListItem[] };

const LOAD_FAILED_MESSAGE = "목록을 불러오지 못했어요.";

export function useRecentIncidents(limit: number) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchIncidents({ signal: controller.signal })
      .then((page) => setState({ status: "success", items: page.results.slice(0, limit) }))
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
  }, [limit, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, retry };
}
