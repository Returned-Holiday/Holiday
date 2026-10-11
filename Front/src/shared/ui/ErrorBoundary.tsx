import { Component, type ReactNode } from "react";
import { GENERIC_ERROR_MESSAGE } from "../api/errors";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

// 오류 원문과 스택은 화면에 보여주지 않는다
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main>
          <h1>문제가 발생했습니다</h1>
          <p>{GENERIC_ERROR_MESSAGE}</p>
        </main>
      );
    }
    return this.props.children;
  }
}
