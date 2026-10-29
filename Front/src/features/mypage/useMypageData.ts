import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";
import { fetchMyReports, type MyReport } from "../report/api";
import { fetchMyIncidents, type MyIncident } from "./api";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; incidents: MyIncident[]; reports: MyReport[] };

export function useMypageData() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [incidents, reports] = await Promise.all([fetchMyIncidents(signal), fetchMyReports(signal)]);
      setState({ status: "success", incidents, reports: reports.results });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      if (error instanceof ApiError || error instanceof TypeError) {
        setState({ status: "error" });
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { state, reload: () => void load() };
}
