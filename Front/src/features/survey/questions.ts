import { PARTICLE_OR, withParticle } from "../../shared/lib/korean";
import type { Answer, YesNoKey } from "./types";

// 임시 설문 (docs/features.md 상황 설문)
export const YES_NO_QUESTIONS: { key: YesNoKey; text: (company: string) => string }[] = [
  { key: "paymentLinked", text: (company) => `${company}에 카드나 계좌 같은 결제수단을 등록한 적이 있나요?` },
  { key: "reusedPassword", text: (company) => `${company}에서 쓰던 비밀번호를 다른 사이트에서도 쓰고 있나요?` },
  {
    key: "impersonationContact",
    text: (company) => `사고 이후 ${withParticle(company, PARTICLE_OR)} 기관을 사칭한 문자·전화·메일을 받은 적이 있나요?`,
  },
  { key: "damageOccurred", text: () => "사고 이후 모르는 결제나 로그인 알림처럼 이상한 일을 겪었나요?" },
];

export const ANSWER_OPTIONS: { value: Answer; label: string }[] = [
  { value: "YES", label: "예" },
  { value: "NO", label: "아니요" },
  { value: "UNKNOWN", label: "잘 모르겠어요" },
];

export const TOTAL_STEPS = YES_NO_QUESTIONS.length + 1;
