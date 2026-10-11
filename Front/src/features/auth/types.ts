export type CurrentUser = {
  nickname: string;
  email: string;
  lastLogin: string | null;
  passwordChangedAt: string;
  passwordExpired: boolean;
  isStaff: boolean;
  otpVerified: boolean;
};
