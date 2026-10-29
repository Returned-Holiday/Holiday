import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import styled from "styled-components";
import { checklistPath, incidentPath } from "../../app/paths";
import { incidentTitle } from "../../features/incident/format";
import { shortMeaning } from "../../features/incident/glossary";
import type { IncidentDetail } from "../../features/incident/types";
import { parseIncidentId, useIncidentDetail } from "../../features/incident/useIncidentDetail";
import { OptionCard } from "../../features/survey/components/OptionCard";
import { SurveyHeader } from "../../features/survey/components/SurveyHeader";
import { ANSWER_OPTIONS, TOTAL_STEPS, YES_NO_QUESTIONS } from "../../features/survey/questions";
import type { SurveyAnswers } from "../../features/survey/types";
import { useSurveyForm } from "../../features/survey/useSurveyForm";
import { useSurveyResponse } from "../../features/survey/useSurveyResponse";
import { isRecord } from "../../shared/lib/guards";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { Button } from "../../shared/ui/Button";
import { PageContainer } from "../../shared/ui/Page";
import { mobileMedia, textStyle } from "../../styles/typography";
import { NotFoundPage } from "../public/NotFoundPage";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-top: 8px;
`;

const Question = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  scroll-margin-top: 24px;

  &:focus {
    outline: none;
  }
`;

const QuestionTitle = styled.legend`
  margin-bottom: 10px;
  padding: 0;
  ${textStyle("h1")}

  ${mobileMedia} {
    ${textStyle("h2")}
  }
`;

const QuestionLead = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Divider = styled.p`
  display: flex;
  align-items: center;
  gap: 12px;
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border.default};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 8px;
`;

const NextButton = styled(Button)`
  flex: 1;
`;

const ErrorText = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

const Note = styled.p`
  padding: 14px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Message = styled.p`
  padding: 80px 0;
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: center;
`;

const Failure = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

function readPrefill(state: unknown): number[] {
  if (!isRecord(state) || !Array.isArray(state.prefillItemIds)) {
    return [];
  }
  return state.prefillItemIds.filter((id): id is number => typeof id === "number");
}

type SurveyFormProps = {
  incident: IncidentDetail;
  saved: SurveyAnswers | null;
  prefillIds: number[];
};

function SurveyForm({ incident, saved, prefillIds }: SurveyFormProps) {
  const navigate = useNavigate();
  const leaked = incident.leakItems.filter((item) => item.isLeaked);
  const form = useSurveyForm(
    incident.id,
    leaked.map((item) => item.id),
    saved,
    prefillIds,
    () => {
      void navigate(checklistPath(incident.id));
    },
  );
  const question = form.step > 1 ? YES_NO_QUESTIONS[form.step - 2] : undefined;

  // 단계가 바뀌면 새 질문으로 포커스 (화면 낭독기가 새 질문을 읽음, 처음 열 때는 X)
  const questionRef = useRef<HTMLFieldSetElement>(null);
  const shownStep = useRef(form.step);
  useEffect(() => {
    if (shownStep.current === form.step) {
      return;
    }
    shownStep.current = form.step;
    questionRef.current?.focus();
  }, [form.step]);

  return (
    <Stack>
      <SurveyHeader
        title={incidentTitle(incident.companyName)}
        step={form.step}
        total={TOTAL_STEPS}
        leakedItems={leaked}
        activeCount={incident.activeCount}
      />

      {form.step === 1 ? (
        <Question ref={questionRef} tabIndex={-1}>
          <QuestionTitle>
            공지된 유출 항목 중
            <br />
            나에게 해당하는 것을 모두 골라주세요
          </QuestionTitle>
          <QuestionLead>
            해당하는 항목을 모두 고르거나, 아래 두 가지 중 하나를 골라주세요. 문자 캡처로 찾은 항목은 미리 체크돼 있어요.
          </QuestionLead>
          {leaked.map((item) => (
            <OptionCard
              key={item.id}
              type="checkbox"
              name="leak-items"
              value={String(item.id)}
              checked={form.draft.selectedItemIds.includes(item.id)}
              label={item.label}
              description={shortMeaning(item.label)}
              onChange={() => form.toggleItem(item.id)}
            />
          ))}
          <Divider>또는</Divider>
          <OptionCard
            type="radio"
            name="leak-other"
            value="UNKNOWN"
            checked={form.draft.leakItemsAnswer === "UNKNOWN"}
            label="잘 모르겠어요"
            onChange={() => form.chooseLeakAnswer("UNKNOWN")}
          />
          <OptionCard
            type="radio"
            name="leak-other"
            value="NONE"
            checked={form.draft.leakItemsAnswer === "NONE"}
            label="해당하는 항목이 없어요"
            onChange={() => form.chooseLeakAnswer("NONE")}
          />
        </Question>
      ) : null}

      {question !== undefined ? (
        <Question ref={questionRef} tabIndex={-1} key={question.key}>
          <QuestionTitle>{question.text(incident.companyName)}</QuestionTitle>
          {ANSWER_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              type="radio"
              name={question.key}
              value={option.value}
              checked={form.draft.answers[question.key] === option.value}
              label={option.label}
              onChange={() => form.answer(question.key, option.value)}
            />
          ))}
        </Question>
      ) : null}

      {form.error ? <ErrorText role="alert">{form.error}</ErrorText> : null}

      <Actions>
        <Button
          variant="tertiary"
          onClick={() => {
            if (form.step === 1) {
              void navigate(incidentPath(incident.id));
            } else {
              form.previous();
            }
          }}
        >
          이전
        </Button>
        <NextButton onClick={() => void form.next()} disabled={form.pending}>
          {form.step === TOTAL_STEPS ? "내 할 일 목록 보기" : "다음"}
        </NextButton>
      </Actions>
      <Note>답변은 할 일 목록을 만드는 데만 쓰이고, 마이페이지에서 언제든 지울 수 있어요.</Note>
    </Stack>
  );
}

export function SurveyPage() {
  const params = useParams();
  const location = useLocation();
  const incidentId = parseIncidentId(params.incidentId);
  const detail = useIncidentDetail(incidentId);
  const survey = useSurveyResponse(incidentId);
  useDocumentTitle(detail.state.status === "notFound" ? null : "내 상황 확인");

  if (detail.state.status === "notFound") {
    return <NotFoundPage />;
  }

  const failed = detail.state.status === "error" || survey.state.status === "error";

  return (
    <PageContainer $maxWidth={680}>
      {!failed && (detail.state.status === "loading" || survey.state.status === "loading") ? (
        <Message role="status">설문을 준비하는 중이에요.</Message>
      ) : null}
      {failed ? (
        <Failure role="alert">
          설문을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              if (detail.state.status === "error") detail.retry();
              if (survey.state.status === "error") survey.retry();
            }}
          >
            다시 시도
          </Button>
        </Failure>
      ) : null}
      {detail.state.status === "success" && survey.state.status === "success" ? (
        <SurveyForm
          incident={detail.state.incident}
          saved={survey.state.answers}
          prefillIds={readPrefill(location.state)}
        />
      ) : null}
    </PageContainer>
  );
}
