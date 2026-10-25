import { useState } from "react";
import { useLocation } from "react-router";
import styled from "styled-components";
import { INCIDENTS_PATH, PASSWORD_CHANGE_PATH } from "../../app/paths";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { formatFullDate, incidentTitle } from "../../features/incident/format";
import { MyIncidentCard } from "../../features/mypage/components/MyIncidentCard";
import { DeleteRecordModal, WithdrawModal } from "../../features/mypage/components/MypageModals";
import { MyReportList } from "../../features/mypage/components/MyReportList";
import { useMypageData } from "../../features/mypage/useMypageData";
import { isRecord } from "../../shared/lib/guards";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { Button, ButtonLink } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { PageContainer } from "../../shared/ui/Page";
import { SideNavContent, SideNavLabel, SideNavLayout, SideNavPanel } from "../../shared/ui/SideNav";
import { mobileMedia, textStyle } from "../../styles/typography";

const PageHeading = styled.h1`
  ${textStyle("displayLg")}

  ${mobileMedia} {
    ${textStyle("h1")}
  }
`;

const SectionTitle = styled.h2`
  padding-top: 8px;
  ${textStyle("h2")}
`;

const AnchorLink = styled.a`
  display: block;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-decoration: none;
  white-space: nowrap;

  &:first-of-type {
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    color: ${({ theme }) => theme.colors.brand.primary};
    font-weight: 700;
  }
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const AccountCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const AccountHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong {
    display: block;
    ${textStyle("h3")}
  }

  span {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

const Fact = styled.div`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface.canvas};

  dt {
    ${textStyle("caption")}
    color: ${({ theme }) => theme.colors.text.mute};
  }

  dd {
    ${textStyle("bodyMdStrong")}
  }
`;

const Hint = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const WithdrawCard = styled(Card)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 32px;

  strong {
    display: block;
    ${textStyle("h3")}
  }

  span {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: center;
`;

const Notice = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.positiveDeep};
`;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(value: string): number | null {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : Math.max(0, Math.floor((Date.now() - time) / DAY_MS));
}

export function MyPage() {
  useDocumentTitle("마이페이지");
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { state, reload } = useMypageData();
  const [deleteTarget, setDeleteTarget] = useState<{ incidentId: number; title: string } | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const passwordChanged = isRecord(location.state) && location.state.passwordChanged === true;

  if (user === null) {
    return null;
  }
  const changedDays = daysSince(user.passwordChangedAt);

  return (
    <PageContainer>
      <SideNavLayout>
        <SideNavPanel aria-label="마이페이지 메뉴">
          <SideNavLabel>마이페이지</SideNavLabel>
          <AnchorLink href="#my-progress">대응 진행 현황</AnchorLink>
          <AnchorLink href="#my-reports">제보 내역</AnchorLink>
          <AnchorLink href="#my-account">계정 설정</AnchorLink>
        </SideNavPanel>
        <SideNavContent>
          <PageHeading id="my-progress">대응 진행 현황</PageHeading>
          {passwordChanged ? <Notice role="status">비밀번호를 바꿨어요.</Notice> : null}
          {state.status === "loading" ? <Empty role="status">불러오는 중이에요.</Empty> : null}
          {state.status === "error" ? (
            <Empty role="alert">
              정보를 불러오지 못했어요.
              <Button variant="tertiary" size="sm" onClick={reload}>
                다시 시도
              </Button>
            </Empty>
          ) : null}
          {state.status === "success" ? (
            <>
              {state.incidents.length === 0 ? (
                <Empty>
                  아직 대응 중인 사고가 없어요.
                  <ButtonLink to={INCIDENTS_PATH} variant="secondary" size="sm">
                    내 사고 찾기
                  </ButtonLink>
                </Empty>
              ) : (
                <Stack>
                  {state.incidents.map((incident) => (
                    <MyIncidentCard
                      key={incident.incidentId}
                      incident={incident}
                      onDelete={() =>
                        setDeleteTarget({
                          incidentId: incident.incidentId,
                          title: incidentTitle(incident.companyName),
                        })
                      }
                    />
                  ))}
                </Stack>
              )}
              <SectionTitle id="my-reports">제보 내역</SectionTitle>
              <MyReportList reports={state.reports} />
            </>
          ) : null}

          <SectionTitle id="my-account">내 계정</SectionTitle>
          <AccountCard>
            <AccountHead>
              <div>
                <strong>{user.nickname} 님</strong>
                <span>{user.email}</span>
              </div>
              <ButtonLink to={PASSWORD_CHANGE_PATH} variant="tertiary">
                비밀번호 변경
              </ButtonLink>
            </AccountHead>
            <dl>
              <Fact>
                <dt>비밀번호 마지막 변경</dt>
                <dd>
                  {formatFullDate(user.passwordChangedAt) ?? "-"}
                  {changedDays !== null ? ` (${changedDays}일 전)` : ""}
                </dd>
              </Fact>
            </dl>
            <Hint>비밀번호는 90일마다 바꿔야 해요. 다른 사이트와 같은 비밀번호는 쓰지 마세요.</Hint>
          </AccountCard>
          {/* 관리자는 탈퇴 X (서버도 403), 비활성화는 서버 명령으로만 */}
          {user.isStaff ? (
            <WithdrawCard>
              <div>
                <strong>회원 탈퇴</strong>
                <span>관리자 계정은 탈퇴할 수 없어요. 계정을 정리하려면 팀에 비활성화를 요청해 주세요.</span>
              </div>
            </WithdrawCard>
          ) : (
            <WithdrawCard>
              <div>
                <strong>회원 탈퇴</strong>
                <span>탈퇴하면 진행 기록과 제보 내역이 바로 삭제돼요.</span>
              </div>
              <Button variant="tertiary" onClick={() => setWithdrawOpen(true)}>
                탈퇴하기
              </Button>
            </WithdrawCard>
          )}
        </SideNavContent>
      </SideNavLayout>

      <DeleteRecordModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          reload();
        }}
      />
      {user.isStaff ? null : <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />}
    </PageContainer>
  );
}
