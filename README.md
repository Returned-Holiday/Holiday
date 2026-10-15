# 반납한연휴 — 개인정보 유출 대응 헬프데스크

2026 SW 개발보안 경진대회 "소개딩" 2라운드(기술경연) 출품작.
개인정보 유출 사고가 났을 때 기업·정부기관의 공식 발표를 기준으로 유출 항목을 확인하고, 상황 설문과 통지문 인식(OCR)으로 맞춤 대응 체크리스트를 제공한다.

- 제출 마감: **10/30(금) 18시**, 팀 목표 **10/28(수) 밤**
- 채점 1순위: 제출 소스코드(백엔드 Python + 프론트 TypeScript)의 **빌드라인당 보안약점 수**

## 처음 왔다면 이 순서로 읽기
1. [대회 개요와 채점 기준](docs/project/competition.md)
2. [역할과 일정](docs/project/team.md)
3. [협업 규칙](docs/rules/common.md) — 브랜치, PR, 주석, Claude Code 사용법
4. 맡은 파트의 시큐어코딩 규칙: [백엔드](docs/rules/secure-python.md) / [프론트](docs/rules/secure-ts.md)
5. [보안 설계](docs/security.md) — 모든 기능의 기준이 되는 정책 값
6. 설계 문서: [백엔드 분담과 구조](docs/backend.md) · [ERD](docs/erd.md) · [API](docs/api.md) · [API 공통 규칙](docs/rules/api-response.md) · [기능명세서](docs/features.md)

## 레포 구조
```
ReturnedHoliday/
├─ CLAUDE.md                      작업 지침(공통)
├─ Back/                          Django 백엔드 — 골격 완료(settings·앱 구조·의존성), 기능 구현 전
├─ Front/                         React + Vite 프론트엔드 — 골격 완료, 화면 구현 전
├─ infra/                         nginx·AWS 설정 기준
├─ docs/
│  ├─ security.md                 보안 설계 원본
│  ├─ backend.md                  백엔드 분담·구조·앱 사이 규칙
│  ├─ erd.md · api.md · features.md
│  ├─ rules/                      common, secure-python, secure-ts, api-response
│  ├─ project/                    competition, team, deliverables, decisions
│  └─ references/guides-summary.md 사전교육 참고 문서 3종 요약
├─ .github/pull_request_template.md
└─ .claude/settings.json          팀 공용 Claude Code 설정(.env 읽기 금지, 커밋에 도구 표시 안 함)
```

## 실행 방법
- 백엔드: `Back/CLAUDE.md`의 명령어 (가상환경 → `pip install --require-hashes ...` → `.env` → `migrate` → `runserver`)
- 프론트: `Front/CLAUDE.md`의 명령어 (`npm ci` → `npm run dev`). `/api` 요청은 `127.0.0.1:8000`의 백엔드로 전달된다
- 필요 버전: Python 3.12 이상, Node 22 이상, 로컬 MySQL 8.x

## 문서 상태 (10/11 기준)

| 문서 | 상태 | 남은 일 · 담당 |
|---|---|---|
| `docs/security.md` | 완료 | 비밀번호를 잊은 사용자 처리 결정(전원, 10/12) |
| `docs/backend.md`, `Back/CLAUDE.md` | 완료 | — |
| `docs/rules/secure-python.md`, `secure-ts.md` | 완료 | — |
| `docs/erd.md` | 완료 | 10/11 검토 반영 항목 확정(전원, 10/12 킥오프), 유출 유형 목록 확정 |
| `docs/project/*`, `docs/references/*` | 완료 | 팀원 이름 기입(`team.md`) |
| `docs/rules/common.md` | 일부 | 브랜치·커밋 규칙(전원, 10/12) |
| `docs/rules/api-response.md` | 일부 | 앱별 에러 코드 확정(각 담당, 10/14) |
| `docs/api.md` | 일부 | 엔드포인트별 요청·응답 필드(각 담당, 10/14) |
| `docs/features.md` | 일부 | 화면별 기능·입력·흐름·빈/에러 상태(FE2, 10/13) |
| `infra/CLAUDE.md` | 일부 | 허용 IP·리소스 이름(BE-A, 배포 준비 시) |
| `Front/CLAUDE.md` | 완료 | — |
| CI 워크플로 | 완료(`.github/workflows/`: backend, frontend, semgrep) | 브랜치 보호에 필수 검사(`backend`, `frontend`, `semgrep`) 등록(레포 관리자, #6·#7 머지 후), 마이그레이션 누락 검사 추가(모델 머지 후, BE-B), 금지 API용 Semgrep 사용자 정의 규칙 추가(`raw()`·`extra()` 등, BE-B) |

## Claude Code로 작업할 때
- 이 레포를 열면 루트 `CLAUDE.md`가, `Back/`·`Front/`·`infra/`에서 작업하면 그 폴더의 `CLAUDE.md`가 함께 적용된다.
- 개인 취향 설정은 각자 `~/.claude/CLAUDE.md`에 두고 이 레포에 커밋하지 않는다.
- 규칙 원문은 `docs/`에 한 번만 쓰고, `CLAUDE.md`는 요약과 참조만 둔다.
