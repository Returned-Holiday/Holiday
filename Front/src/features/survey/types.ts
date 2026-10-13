import { isRecord } from "../../shared/lib/guards";

export type Answer = "YES" | "NO" | "UNKNOWN";
export type LeakItemsAnswer = "SELECTED" | "UNKNOWN" | "NONE";

export type SurveyAnswers = {
  leakItemsAnswer: LeakItemsAnswer;
  selectedItemIds: number[];
  paymentLinked: Answer;
  reusedPassword: Answer;
  impersonationContact: Answer;
  damageOccurred: Answer;
};

export type YesNoKey = "paymentLinked" | "reusedPassword" | "impersonationContact" | "damageOccurred";

const isAnswer = (value: unknown): value is Answer =>
  value === "YES" || value === "NO" || value === "UNKNOWN";

export function isSurveyAnswers(value: unknown): value is SurveyAnswers {
  return (
    isRecord(value) &&
    (value.leakItemsAnswer === "SELECTED" ||
      value.leakItemsAnswer === "UNKNOWN" ||
      value.leakItemsAnswer === "NONE") &&
    Array.isArray(value.selectedItemIds) &&
    value.selectedItemIds.every((id) => typeof id === "number") &&
    isAnswer(value.paymentLinked) &&
    isAnswer(value.reusedPassword) &&
    isAnswer(value.impersonationContact) &&
    isAnswer(value.damageOccurred)
  );
}
