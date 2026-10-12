import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { LOGIN_PATH, PASSWORD_CHANGE_PATH } from "../paths";

// UX용 가드, 실제 권한 체크는 서버
export function RequireAuth() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const location = useLocation();

  // 만료 모달 뒤는 빈 화면
  if (sessionExpired) {
    return null;
  }

  if (status === "loading") {
    return <p role="status">불러오는 중입니다.</p>;
  }

  if (status === "anonymous" || user === null) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />;
  }

  if (user.passwordExpired && location.pathname !== PASSWORD_CHANGE_PATH) {
    return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  }

  return <Outlet />;
}
