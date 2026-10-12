import { useState } from "react";
import { ApiError, GENERIC_ERROR_MESSAGE } from "../../shared/api/errors";
import { saveSurvey } from "./api";
import { TOTAL_STEPS, YES_NO_QUESTIONS } from "./questions";
import type { Answer, LeakItemsAnswer, SurveyAnswers, YesNoKey } from "./types";

type Draft = {
  leakItemsAnswer: LeakItemsAnswer | null;
  selectedItemIds: number[];
  answers: Partial<Record<YesNoKey, Answer>>;
};

function toDraft(saved: SurveyAnswers | null, prefillIds: number[]): Draft {
  if (saved !== null) {
    return {
      leakItemsAnswer: saved.leakItemsAnswer,
      selectedItemIds: saved.selectedItemIds,
      answers: {
        paymentLinked: saved.paymentLinked,
        reusedPassword: saved.reusedPassword,
        impersonationContact: saved.impersonationContact,
        damageOccurred: saved.damageOccurred,
      },
    };
  }
  return {
    leakItemsAnswer: prefillIds.length > 0 ? "SELECTED" : null,
    selectedItemIds: prefillIds,
    answers: {},
  };
}

export function useSurveyForm(
  incidentId: number,
  leakedIds: number[],
  saved: SurveyAnswers | null,
  prefillIds: number[],
  onSaved: () => void,
) {
  // 이 사고의 유출 항목 ID만 (선택지 조작 방지는 서버가 최종)
  const allowed = new Set(leakedIds);
  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(saved, prefillIds.filter((id) => allowed.has(id))),
  );
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleItem = (id: number) =>
    setDraft((current) => {
      const selected = current.selectedItemIds.includes(id)
        ? current.selectedItemIds.filter((itemId) => itemId !== id)
        : [...current.selectedItemIds, id];
      return { ...current, selectedItemIds: selected, leakItemsAnswer: selected.length > 0 ? "SELECTED" : null };
    });

  const chooseLeakAnswer = (answer: "UNKNOWN" | "NONE") =>
    setDraft((current) => ({ ...current, leakItemsAnswer: answer, selectedItemIds: [] }));

  const answer = (key: YesNoKey, value: Answer) =>
    setDraft((current) => ({ ...current, answers: { ...current.answers, [key]: value } }));

  const currentKey = step > 1 ? YES_NO_QUESTIONS[step - 2]?.key : undefined;
  const stepAnswered =
    step === 1 ? draft.leakItemsAnswer !== null : currentKey !== undefined && draft.answers[currentKey] !== undefined;

  const toAnswers = (): SurveyAnswers | null => {
    const { paymentLinked, reusedPassword, impersonationContact, damageOccurred } = draft.answers;
    if (
      draft.leakItemsAnswer === null ||
      paymentLinked === undefined ||
      reusedPassword === undefined ||
      impersonationContact === undefined ||
      damageOccurred === undefined
    ) {
      return null;
    }
    return {
      leakItemsAnswer: draft.leakItemsAnswer,
      selectedItemIds: draft.selectedItemIds,
      paymentLinked,
      reusedPassword,
      impersonationContact,
      damageOccurred,
    };
  };

  const next = async () => {
    if (!stepAnswered) {
      setError(step === 1 ? "해당하는 항목을 고르거나, 아래 두 가지 중 하나를 골라 주세요." : "답을 하나 골라 주세요.");
      return;
    }
    setError(null);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    const answers = toAnswers();
    if (answers === null) {
      setError("답하지 않은 질문이 있어요.");
      return;
    }
    setPending(true);
    try {
      await saveSurvey(incidentId, answers);
      onSaved();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message || GENERIC_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  };

  const previous = () => {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  return { draft, step, currentKey, error, pending, toggleItem, chooseLeakAnswer, answer, next, previous };
}
