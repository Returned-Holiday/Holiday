import { isRecord } from "../../shared/lib/guards";

export type CurrentUser = {
  nickname: string;
  email: string;
  passwordChangedAt: string;
  passwordExpired: boolean;
  isStaff: boolean;
  otpVerified: boolean;
};

export function isCurrentUser(value: unknown): value is CurrentUser {
  return (
    isRecord(value) &&
    typeof value.nickname === "string" &&
    typeof value.email === "string" &&
    typeof value.passwordChangedAt === "string" &&
    typeof value.passwordExpired === "boolean" &&
    typeof value.isStaff === "boolean" &&
    typeof value.otpVerified === "boolean"
  );
}
