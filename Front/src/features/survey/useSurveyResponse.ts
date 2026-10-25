import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";
import { fetchSurvey } from "./api";
import type { SurveyAnswers } from "./types";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; answers: SurveyAnswers | null };

export function useSurveyResponse(incidentId: number | null) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (incidentId === null) {
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchSurvey(incidentId, controller.signal)
      .then((answers) => setState({ status: "success", answers }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (error instanceof ApiError || error instanceof TypeError) {
          setState({ status: "error" });
          return;
        }
        throw error;
      });
    return () => controller.abort();
  }, [incidentId, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, retry };
}
