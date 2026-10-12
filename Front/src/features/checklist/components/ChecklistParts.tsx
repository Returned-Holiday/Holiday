import styled from "styled-components";
import refreshIcon from "../../../assets/icons/refresh.svg";
import { toSafeHttpsUrl } from "../../../shared/lib/validators";
import { ButtonLink } from "../../../shared/ui/Button";
import { Illustration } from "../../../shared/ui/Illustration";
import { SafeExternalLink } from "../../../shared/ui/SafeExternalLink";
import { mobileMedia, textStyle } from "../../../styles/typography";

const Hero = styled.section`
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.navy};
  color: ${({ theme }) => theme.colors.text.onDark};

  ${mobileMedia} {
    padding: 24px 20px;

    img {
      display: none;
    }
  }
`;

const HeroText = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
`;

const HeroEyebrow = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.onDarkSub};
`;

const HeroTitle = styled.h1`
  ${textStyle("displayLg")}
  letter-spacing: -0.01em;

  ${mobileMedia} {
    ${textStyle("h1")}
  }
`;

const HeroLead = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.onDarkSub};
  white-space: pre-line;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 6px;
`;

const Track = styled.div`
  width: min(380px, 100%);
  height: 12px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.18);
`;

const Fill = styled.div<{ $ratio: number }>`
  width: ${({ $ratio }) => `${Math.round($ratio * 100)}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.colors.accent.sky};
`;

const ProgressText = styled.p`
  flex-shrink: 0;
  ${textStyle("h3")}
  color: ${({ theme }) => theme.colors.accent.sky};
`;

type ChecklistHeroProps = {
  title: string;
  completed: number;
  total: number;
};

export function ChecklistHero({ title, completed, total }: ChecklistHeroProps) {
  const done = total > 0 && completed >= total;
  return (
    <Hero aria-labelledby="checklist-title">
      <HeroText>
        <HeroEyebrow>{title}</HeroEyebrow>
        <HeroTitle id="checklist-title">{done ? "모든 조치를 마쳤어요!" : "내 할 일 목록"}</HeroTitle>
        <HeroLead>
          {done
            ? "수고했어요. 공지가 바뀌면 다시 알려드릴게요."
            : "급한 일부터 순서대로 정리했어요.\n하나씩 끝내고 체크하면 자동으로 저장돼요."}
        </HeroLead>
        <ProgressRow>
          <Track
            role="progressbar"
            aria-label="조치 진행률"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
          >
            <Fill $ratio={total === 0 ? 0 : completed / total} />
          </Track>
          <ProgressText>
            {completed} / {total} 완료
          </ProgressText>
        </ProgressRow>
      </HeroText>
      <Illustration name={done ? "done" : "laptop"} width={184} />
    </Hero>
  );
}

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 14px 20px;
  border: 1.5px solid ${({ theme }) => theme.colors.status.leak};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.status.leakPale};

  strong {
    display: block;
    ${textStyle("bodyMdStrong")}
    color: ${({ theme }) => theme.colors.status.leakDeep};
  }

  span {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
  }

  ${mobileMedia} {
    flex-wrap: wrap;
  }
`;

const BannerText = styled.p`
  flex: 1;
  min-width: 0;
`;

export function NoticeRevisedBanner({ surveyTo }: { surveyTo: string }) {
  return (
    <Banner role="status">
      <img src={refreshIcon} width={20} height={20} alt="" />
      <BannerText>
        <strong>공지 내용이 갱신됐어요</strong>
        <span>유출 항목이 바뀌었어요. 설문을 다시 확인해 주세요.</span>
      </BannerText>
      <ButtonLink to={surveyTo} variant="tertiary" size="sm">
        설문 다시 보기
      </ButtonLink>
    </Banner>
  );
}

const InfoCard = styled.dl`
  padding: 10px 28px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 6px 20px;
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }

  dt {
    width: 110px;
    flex-shrink: 0;
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.text.mute};
  }

  dd {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  a {
    ${textStyle("bodyMdStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }

  ${mobileMedia} {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
`;

const Muted = styled.span`
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

const Contact = styled.span`
  ${textStyle("bodyMdStrong")}
  white-space: pre-line;
  overflow-wrap: anywhere;
`;

type BaseInfoProps = {
  companyName: string;
  sourceUrl: string;
  contactInfo: string | null;
};

// 체크리스트 위 기본 안내 (진행률 제외)
export function BaseInfo({ companyName, sourceUrl, contactInfo }: BaseInfoProps) {
  const source = toSafeHttpsUrl(sourceUrl);
  return (
    <InfoCard>
      {source ? (
        <InfoRow>
          <dt>공지 원문</dt>
          <dd>
            <SafeExternalLink href={source.href} showDomain={false}>
              {companyName} 개인정보 유출 안내 (새 창)
            </SafeExternalLink>
            <Muted>{source.hostname}</Muted>
          </dd>
        </InfoRow>
      ) : null}
      {contactInfo ? (
        <InfoRow>
          <dt>기업 상담센터</dt>
          <dd>
            <Contact>{contactInfo}</Contact>
          </dd>
        </InfoRow>
      ) : null}
    </InfoCard>
  );
}

const Empty = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  text-align: center;

  h1 {
    ${textStyle("h1")}
  }

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }

  ${mobileMedia} {
    padding: 28px 20px;

    h1 {
      ${textStyle("h2")}
    }
  }
`;

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
`;

type NoActionsProps = {
  surveyTo: string;
  detailTo: string;
};

export function NoActions({ surveyTo, detailTo }: NoActionsProps) {
  return (
    <Empty aria-labelledby="no-actions-title">
      <Illustration name="done" width={246} />
      <h1 id="no-actions-title">선택한 내용으로는 추가 조치가 없어요</h1>
      <p>
        지금 답한 내용으로는 따로 해야 할 일이 없어요.
        <br />
        그래도 아래 공지 원문과 상담센터는 한 번 확인해 주세요.
      </p>
      <EmptyActions>
        <ButtonLink to={surveyTo} variant="tertiary">
          설문 다시 하기
        </ButtonLink>
        <ButtonLink to={detailTo}>사고 상세로 돌아가기</ButtonLink>
      </EmptyActions>
    </Empty>
  );
}
