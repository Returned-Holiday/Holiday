import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../shared/api/errors";

type State<T> = { status: "loading" } | { status: "error" } | { status: "success"; data: T };

// loader는 호출 측에서 useCallback으로 고정
export function useAdminLoad<T>(loader: (signal?: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ status: "loading" });

  const run = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await loader(signal);
        setState({ status: "success", data });
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
    },
    [loader],
  );

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void run(controller.signal);
    return () => controller.abort();
  }, [run]);

  return { state, reload: () => void run() };
}
