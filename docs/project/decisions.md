# 결정 기록

확정된 결정만 적는다. 바꾸려면 PR로 이 표에 새 줄을 추가하고, 이전 줄에는 "변경됨 → 날짜"를 표시한다. ERD 세부 결정은 `docs/erd.md`에 있다.

| 날짜 | 결정 | 이유 | 관련 문서 |
|---|---|---|---|
| 10/7, 10/11 | ERD 테이블 구성과 설계 결정 | ERD 논의 | `docs/erd.md` |
| 10/11 | 「2라운드 사전교육 자료_vF」를 기준 문서로 삼음 (마감 10/30 18시) | 자료 간 값이 다를 때 혼선 방지 | `docs/project/competition.md` |
| 10/11 | 2라운드(기술경연)에만 집중. 3라운드는 문서·계획 범위에서 제외 | 팀 결정 | `docs/project/competition.md` |
| 10/11 | 대회 미션은 없는 것으로 보고 일정에 미션 슬롯을 두지 않음 | 팀 판단 | `docs/project/team.md` |
| 10/11 | 프론트(TS)도 진단 범위로 보고 같은 수준의 규칙 적용 | 대회 확인 | `docs/rules/secure-ts.md` |
| 10/11 | 레포 하나(Returned-Holiday/Holiday)에 Back/Front/infra/docs. 공통 규칙은 docs에 한 번만 쓰고 CLAUDE.md는 참조 | 복사본이 어긋나는 문제 방지 | `README.md` |
| 10/11 | ~~역할: FE 1명, 백엔드 3명~~ 변경됨 → 10/11 | | |
| 10/11 | **역할: 프론트 2명(FE1, FE2), 백엔드 2명(BE-A, BE-B)** | 팀 구성 | `docs/project/team.md` |
| 10/11 | 일정: 10/23 역할 완료, 10/23–24 QA1, 10/26 오후 QA2 후 동결, 10/28 밤 제출 | 팀 결정 | `docs/project/team.md` |
| 10/11 | ~~관리자 기능은 Django admin~~ 변경됨 → 10/11 | | |
| 10/11 | **관리자 기능은 React 관리자 화면(FE2) + 각 앱 담당이 만드는 관리자 API. Django 기본 admin은 설치하지 않음** | 프론트 인원이 2명으로 늘어 관리자 화면을 직접 만들 여유가 생김 | `docs/security.md`, `docs/api.md` |
| 10/11 | 인증은 서버 세션 방식 (JWT 미사용) | 기획서 5-1. 즉시 무효화, HttpOnly 쿠키 | `docs/security.md` |
| 10/11 | 비밀번호 찾기 기능 없음 | 일정. 복구 경로가 없어 웹 PR 항목 공격면 제거 | `docs/security.md` |
| 10/11 | 로그인 5회 실패 시 30분 잠금 | 진단 SR2-2(5회 이내). 계정 잠금 악용을 줄이려고 짧게 | `docs/security.md` |
| 10/11 | 비밀번호 변경 주기 90일(로그인 시 강제), 최근 4개 재사용 금지, 최소 사용 1일 | 진단가이드 3(6)개월과 기반시설 BF 반기 중 엄격한 쪽 | `docs/security.md` |
| 10/11 | ~~관리자: 비공개 경로 + 별도 포트 + 허용 IP + TOTP~~ 변경됨 → 10/11 | | |
| 10/11 | **관리자: 관리자 API는 허용 IP(nginx) + `is_staff` + TOTP 2차 인증, 관리자 화면은 비관리자에게 404.** 별도 포트는 쓰지 않음 | 관리자 화면이 SPA라 같은 출처여야 세션·CSRF를 그대로 씀. 기반 AE의 근본 대책(지정 IP) + 2차 인증은 유지 | `docs/security.md`, `infra/CLAUDE.md` |
| 10/11 | 로그 보관: 관리자 접속·처리 1년, 보안 이벤트·nginx·RDS 90일, 일반 앱 30일 | 개인정보 안전성 확보조치 기준, 정보통신망법 고시 | `docs/security.md` |
| 10/11 | 6개월 미로그인 계정 만료는 넣지 않음 | 비밀번호 찾기가 없어 복구 불가. 90일 강제 변경이 같은 목적을 대신함 | `docs/security.md` |
| 10/11 | PR은 자기가 머지해도 됨. 단 BE-A의 PR은 BE-B가 보안 리뷰, 보안 관련 프론트 PR은 BE-B에게 보여주고 머지 | 소규모 팀, 백엔드 분담 문서 | `docs/rules/common.md` |
| 10/11 | 주석은 "왜"만 한국어 한 줄. 이모지·AI 관련 용어·장식·변경 이력 주석 금지 | 심사위원이 소스코드를 읽음 | `docs/rules/common.md`, `CLAUDE.md` |
| 10/11 | 백엔드는 앱 단위 분담: BE-A(`accounts`, `guides`, 인프라·`config`), BE-B(`common`, `incidents`, `reports`, `mypage`, CI 보안 도구, BE-A 보안 검증) | 백엔드 팀 문서 | `docs/backend.md` |
| 10/11 | API 경로는 `/api/<앱>/...`(버전 접두사 없음), 관리자는 `/api/admin/<앱>/...` | 백엔드 팀 문서 | `docs/api.md` |
| 10/11 | 앱 사이 규칙: 의존 방향 한쪽, 다른 앱은 `services`로만 호출, 보안 판단은 `common`, 모델은 담당자만 | 서로 기다리지 않고 코드를 깨지 않기 위해 | `docs/backend.md` |
| 10/11 | 비밀번호 변경·탈퇴는 요청에서 현재 비밀번호를 매번 확인(별도 재인증 세션 없음) | 경로 단순화(`/api/auth/password/`, `/api/auth/withdraw/`) | `docs/security.md` |
| 10/11 | 브랜치: `dev`(기본, 개발 통합) → `main`(제출·배포). 작업 브랜치는 `dev`로 PR, 둘 다 직접 push 금지 | 제출·배포본과 개발 중인 코드 분리 | `docs/rules/common.md` |
| 10/11 | 로그인 잠금은 계정 기준만(django-axes). IP 단위 제한은 DRF `login` 요청 제한이 맡음 | nginx 뒤에서 axes가 실제 IP를 몰라 IP 잠금을 켜면 전체 사용자가 함께 잠김 | `Back/config/settings/base.py` |
