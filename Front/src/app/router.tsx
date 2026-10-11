import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { LoginPage } from "../pages/auth/LoginPage";
import { PasswordChangePage } from "../pages/auth/PasswordChangePage";
import { SignupPage } from "../pages/auth/SignupPage";
import { ChecklistPage } from "../pages/member/ChecklistPage";
import { MyPage } from "../pages/member/MyPage";
import { OcrUploadPage } from "../pages/member/OcrUploadPage";
import { ReportNewPage } from "../pages/member/ReportNewPage";
import { SurveyPage } from "../pages/member/SurveyPage";
import { FaqPage } from "../pages/public/FaqPage";
import { IncidentDetailPage } from "../pages/public/IncidentDetailPage";
import { MainPage } from "../pages/public/MainPage";
import { NotFoundPage } from "../pages/public/NotFoundPage";
import { PrivacyPolicyPage } from "../pages/public/PrivacyPolicyPage";
import { RequireAdmin } from "./guards/RequireAdmin";
import { RequireAuth } from "./guards/RequireAuth";
import { ADMIN_BASE_PATH, ADMIN_OTP_PATH, LOGIN_PATH, PASSWORD_CHANGE_PATH } from "./paths";

// 관리자 화면 lazy 분리
const AdminOtpPage = lazy(() =>
  import("../pages/admin/AdminOtpPage").then((module) => ({ default: module.AdminOtpPage })),
);
const AdminIncidentListPage = lazy(() =>
  import("../pages/admin/AdminIncidentListPage").then((module) => ({
    default: module.AdminIncidentListPage,
  })),
);
const AdminIncidentEditPage = lazy(() =>
  import("../pages/admin/AdminIncidentEditPage").then((module) => ({
    default: module.AdminIncidentEditPage,
  })),
);
const AdminCompanyPage = lazy(() =>
  import("../pages/admin/AdminCompanyPage").then((module) => ({ default: module.AdminCompanyPage })),
);
const AdminActionPage = lazy(() =>
  import("../pages/admin/AdminActionPage").then((module) => ({ default: module.AdminActionPage })),
);
const AdminReportPage = lazy(() =>
  import("../pages/admin/AdminReportPage").then((module) => ({ default: module.AdminReportPage })),
);

export const router = createBrowserRouter([
  { path: "/", element: <MainPage /> },
  { path: "/incidents/:incidentId", element: <IncidentDetailPage /> },
  { path: "/faq", element: <FaqPage /> },
  { path: "/privacy", element: <PrivacyPolicyPage /> },
  { path: LOGIN_PATH, element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: PASSWORD_CHANGE_PATH, element: <PasswordChangePage /> },
      { path: "/ocr", element: <OcrUploadPage /> },
      { path: "/incidents/:incidentId/survey", element: <SurveyPage /> },
      { path: "/incidents/:incidentId/checklist", element: <ChecklistPage /> },
      { path: "/reports/new", element: <ReportNewPage /> },
      { path: "/me", element: <MyPage /> },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      { path: ADMIN_OTP_PATH, element: <AdminOtpPage /> },
      { path: `${ADMIN_BASE_PATH}/incidents`, element: <AdminIncidentListPage /> },
      { path: `${ADMIN_BASE_PATH}/incidents/:incidentId`, element: <AdminIncidentEditPage /> },
      { path: `${ADMIN_BASE_PATH}/companies`, element: <AdminCompanyPage /> },
      { path: `${ADMIN_BASE_PATH}/actions`, element: <AdminActionPage /> },
      { path: `${ADMIN_BASE_PATH}/reports`, element: <AdminReportPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
