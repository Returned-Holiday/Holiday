import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";
import { fetchChecklist, setCompletion } from "./api";
import type { Checklist } from "./types";

type State =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "success"; checklist: Checklist };

const LOAD_FAILED_MESSAGE = "할 일 목록을 불러오지 못했어요.";
const SAVE_FAILED_MESSAGE = "체크를 저장하지 못했어요. 다시 시도해 주세요.";

export function useChecklist(incidentId: number | null) {
  const [state, setState] = useState<State>(
    incidentId === null ? { status: "notFound" } : { status: "loading" },
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (incidentId === null) {
        setState({ status: "notFound" });
        return;
      }
      try {
        const checklist = await fetchChecklist(incidentId, signal);
        setState({ status: "success", checklist });
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "notFound" });
          return;
        }
        if (error instanceof ApiError || error instanceof TypeError) {
          setState({ status: "error", message: LOAD_FAILED_MESSAGE });
          return;
        }
        throw error;
      }
    },
    [incidentId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // 진행률·목록은 서버 계산값으로 다시 받음
  const toggle = async (actionId: number, completed: boolean) => {
    if (incidentId === null) {
      return;
    }
    setSavingId(actionId);
    setSaveError(null);
    try {
      await setCompletion(incidentId, actionId, completed);
      await load();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setSaveError(SAVE_FAILED_MESSAGE);
    } finally {
      setSavingId(null);
    }
  };

  return { state, toggle, savingId, saveError, retry: () => void load() };
}
