import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { bootstrapSession } from "../features/auth/session";
import { ErrorBoundary } from "../shared/ui/ErrorBoundary";
import { AppProviders } from "./providers";
import { router } from "./router";

export function App() {
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
