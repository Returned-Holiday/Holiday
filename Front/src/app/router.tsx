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
import { ServerErrorPage } from "../pages/public/ServerErrorPage";
import { TermsPage } from "../pages/public/TermsPage";
import { RequireAdmin } from "./guards/RequireAdmin";
import { RequireAuth } from "./guards/RequireAuth";
import { SiteLayout } from "./layout/SiteLayout";
import {
  ADMIN_ACTIONS_PATH,
  ADMIN_COMPANIES_PATH,
  ADMIN_INCIDENTS_PATH,
  ADMIN_OTP_PATH,
  ADMIN_REPORTS_PATH,
  FAQ_PATH,
  HOME_PATH,
  LOGIN_PATH,
  MYPAGE_PATH,
  OCR_PATH,
  PASSWORD_CHANGE_PATH,
  PRIVACY_PATH,
  REPORT_NEW_PATH,
  SIGNUP_PATH,
  TERMS_PATH,
} from "./paths";

// 관리자 화면 lazy 분리
const AdminLayout = lazy(() =>
  import("./layout/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
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
  {
    element: <SiteLayout />,
    errorElement: (
      <SiteLayout>
        <ServerErrorPage />
      </SiteLayout>
    ),
    children: [
      { path: HOME_PATH, element: <MainPage /> },
      { path: "/incidents/:incidentId", element: <IncidentDetailPage /> },
      { path: FAQ_PATH, element: <FaqPage /> },
      { path: PRIVACY_PATH, element: <PrivacyPolicyPage /> },
      { path: TERMS_PATH, element: <TermsPage /> },
      { path: LOGIN_PATH, element: <LoginPage /> },
      { path: SIGNUP_PATH, element: <SignupPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: PASSWORD_CHANGE_PATH, element: <PasswordChangePage /> },
          { path: OCR_PATH, element: <OcrUploadPage /> },
          { path: "/incidents/:incidentId/survey", element: <SurveyPage /> },
          { path: "/incidents/:incidentId/checklist", element: <ChecklistPage /> },
          { path: REPORT_NEW_PATH, element: <ReportNewPage /> },
          { path: MYPAGE_PATH, element: <MyPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireAdmin />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: ADMIN_OTP_PATH, element: <AdminOtpPage /> },
          { path: ADMIN_INCIDENTS_PATH, element: <AdminIncidentListPage /> },
          { path: `${ADMIN_INCIDENTS_PATH}/:incidentId`, element: <AdminIncidentEditPage /> },
          { path: ADMIN_COMPANIES_PATH, element: <AdminCompanyPage /> },
          { path: ADMIN_ACTIONS_PATH, element: <AdminActionPage /> },
          { path: ADMIN_REPORTS_PATH, element: <AdminReportPage /> },
        ],
      },
    ],
  },
]);
