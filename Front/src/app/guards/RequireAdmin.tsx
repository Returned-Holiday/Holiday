import { Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { NotFoundPage } from "../../pages/public/NotFoundPage";
import { ADMIN_OTP_PATH, PASSWORD_CHANGE_PATH } from "../paths";

// 관리자가 아니면 로그인 화면 대신 404를 보여 관리자 화면의 존재를 드러내지 않는다
export function RequireAdmin() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (status === "loading") {
    return <p role="status">불러오는 중입니다.</p>;
  }

  if (status !== "authenticated" || user === null || !user.isStaff) {
    return <NotFoundPage />;
  }

  if (user.passwordExpired) {
    return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  }

  if (!user.otpVerified && location.pathname !== ADMIN_OTP_PATH) {
    return <Navigate to={ADMIN_OTP_PATH} replace />;
  }

  return (
    <Suspense fallback={<p role="status">불러오는 중입니다.</p>}>
      <Outlet />
    </Suspense>
  );
}
