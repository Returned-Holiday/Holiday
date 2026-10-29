import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { bootstrapSession } from "../features/auth/session";
import { useSessionWatch } from "../features/auth/useSessionWatch";
import { ErrorBoundary } from "../shared/ui/ErrorBoundary";
import { AppProviders } from "./providers";
import { router } from "./router";

export function App() {
  useSessionWatch();

  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <AppProviders>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AppProviders>
  );
}
