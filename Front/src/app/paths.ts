export const HOME_PATH = "/";
export const INCIDENTS_PATH = "/incidents";
export const FAQ_PATH = "/faq";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const PASSWORD_CHANGE_PATH = "/account/password";
export const OCR_PATH = "/ocr";
export const REPORT_NEW_PATH = "/reports/new";
export const MYPAGE_PATH = "/me";
export const ADMIN_BASE_PATH = "/manage";
export const ADMIN_OTP_PATH = `${ADMIN_BASE_PATH}/otp`;
export const ADMIN_INCIDENTS_PATH = `${ADMIN_BASE_PATH}/incidents`;
export const ADMIN_COMPANIES_PATH = `${ADMIN_BASE_PATH}/companies`;
export const ADMIN_ACTIONS_PATH = `${ADMIN_BASE_PATH}/actions`;
export const ADMIN_REPORTS_PATH = `${ADMIN_BASE_PATH}/reports`;

export function incidentPath(incidentId: number | string): string {
  return `${INCIDENTS_PATH}/${encodeURIComponent(String(incidentId))}`;
}

export function surveyPath(incidentId: number | string): string {
  return `${incidentPath(incidentId)}/survey`;
}

export function checklistPath(incidentId: number | string): string {
  return `${incidentPath(incidentId)}/checklist`;
}
