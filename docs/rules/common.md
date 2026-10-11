# 협업 규칙

역할 코드(FE1, FE2, BE-A, BE-B)는 `docs/project/team.md` 참고.

## 브랜치
- `main`: 항상 배포 가능한 상태. **직접 push 금지**(GitHub 브랜치 보호로 강제)
- 작업 브랜치 이름: TODO(전원, 10/12 킥오프). 제안: `feat/<영역>-<내용>`, `fix/<영역>-<내용>`, `docs/<내용>`
  - 예: `feat/accounts-login`, `fix/checklist-progress`, `docs/security-log-policy`

## 커밋 메시지
TODO(전원, 10/12 킥오프). 제안: `<종류>: <무엇을>` 한 줄 + 필요하면 본문
- 종류: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `security`
- 예: `security: 제보 마스킹에 카드번호·계좌번호 추가`

## PR
- 모든 변경은 PR로 머지한다. **자기 PR은 자기가 머지해도 된다**(팀 결정).
- 한 PR은 한 기능 단위, 변경 400줄 이하를 권장한다.
- PR 템플릿(`.github/pull_request_template.md`)의 체크리스트를 채운다.
- PR 설명에 "무엇을 / 어떤 보안 처리로" 1~2줄을 쓴다. 서비스 개요서와 발표자료의 재료가 된다.

### 머지 조건
- CI 통과: Semgrep, Bandit, pip-audit, npm audit, ESLint, `tsc`, 테스트
- 리뷰는 기본적으로 필수가 아니다. 예외 두 가지:
  - **BE-A의 PR은 모두 BE-B가 보안 관점으로 리뷰**한 뒤 머지한다(`docs/backend.md`)
  - 프론트 PR 중 **인증·권한·업로드·외부 링크·HTML 렌더링·의존성**을 건드린 것은 BE-B에게 한 번 보여주고 머지한다
- 보안 정책 값을 바꾸는 PR은 `docs/security.md`와 `docs/project/decisions.md`를 같은 PR에서 고친다

## 주석 규칙
제출 소스코드를 심사위원이 읽는다. 주석은 사람이 직접 메모한 것처럼 **핵심 키워드만 짧게** 쓴다.

- **키워드·명사형으로 쓴다.** 문장으로 풀어 쓰지 않는다(`~한다`, `~하므로`, `~때문에` 금지). 한 줄, 대략 30자 이내
  - 좋음: `// 메모리에만 보관 (storage 저장 X)`
  - 좋음: `# 기본 핸들러는 2.5MB 초과 시 디스크 저장 → 메모리만`
  - 좋음: `# 비관리자 → 404 (관리자 API 존재 숨김)`
  - 나쁨: `// 로그인 정보가 브라우저 저장소에 남지 않도록 메모리에만 둔다`
  - 나쁨: `# 파일 업로드 핸들러를 설정합니다`
- 화살표(`→`), 괄호, `X`, `=` 같은 기호로 줄여 쓴다
- 코드로 알 수 있는 내용, 자명한 코드에는 달지 않는다. **보안상 이유가 있는 곳**(검증, 제한, 일부러 막은 곳)에만 단다
- 금지
  - 이모지, 장식용 구분선(`# =====`, `// -----`), 굵게·제목 같은 마크다운 표기
  - AI 관련 용어(AI, Claude, GPT, LLM, 생성, 어시스턴트 등)
  - 단계 번호 나열(`# 1단계:`, `// Step 1`), 코드를 그대로 풀어 쓴 설명
  - 변경 이력성 주석(`# 수정함`, `# 새로 추가`, `# 기존 코드`), 날짜·작성자 표기
  - TODO·FIXME, 주석 처리된 코드, 디버그용 주석
  - docstring. 함수 이름과 타입으로 설명한다
- 커밋 메시지와 PR 설명도 같은 톤으로 쓴다
- 커밋·PR에 `Co-Authored-By` 같은 공동 작성자 표시, 생성 도구 표시, 세션 링크를 넣지 않는다. `.claude/settings.json`의 `attribution` 설정으로 Claude Code가 자동으로 붙이지 않게 막아 두었다
- 커밋 작성자는 본인 GitHub 계정이어야 한다. 처음 한 번 `git config user.name`, `git config user.email`을 본인 GitHub 계정과 같게 설정한다

## 모델·마이그레이션
- 앱별 모델 담당자만 모델을 고친다. 담당: `accounts`·`guides`는 BE-A, `incidents`·`reports`는 BE-B (`docs/backend.md`)
- 뼈대 단계에서 BE-A가 전체 모델을 한 번에 만들고, 이후 다른 사람 앱의 모델은 PR로 담당자 리뷰를 받는다
- 모델 변경 PR에는 `docs/erd.md` 수정을 함께 넣는다
- 마이그레이션 충돌이 나면 직접 머지하지 말고 담당자와 상의 후 `makemigrations --merge`

## 의존성
- 새 패키지는 **BE-B 승인** 후 추가한다. 패키지 이름 철자를 반드시 확인한다(비슷한 이름의 악성 패키지 주의)
- Python: `requirements/*.in` 수정 → `pip-compile --generate-hashes` → 생성된 `.txt` 함께 커밋
- npm: `npm install <패키지>` 후 `package-lock.json` 함께 커밋. CI와 배포는 `npm ci`

## 비밀값
- 키·비밀번호·토큰은 코드, 주석, 설정 기본값, 테스트, 커밋 메시지, 이슈, PR 어디에도 쓰지 않는다
- 로컬은 `.env`(커밋 금지, `.env.example`만 커밋), 운영은 AWS Secrets Manager
- 실수로 커밋했으면 즉시 BE-B에게 알리고 **키를 폐기·재발급**한다(히스토리 삭제만으로는 부족)

## 보안약점 관리
- 도구나 리뷰에서 발견한 약점은 GitHub Issue로 등록한다
  - 라벨: `weakness` + 분류(`input`, `security-feature`, `error`, `code-error`, `encapsulation`, `api-misuse`, `time-state`)
  - 제목 예: `[weakness] guides/views.py: except Exception 사용`
- 고치는 PR 설명에 `Closes #번호`를 넣는다. 조치율은 이 Issue로 집계한다

## Claude Code 사용 규칙
- 공용 설정: 루트·`Back/`·`Front/`·`infra/`의 `CLAUDE.md`, `.claude/settings.json`. 개인 취향은 각자 `~/.claude/CLAUDE.md`에 두고 커밋하지 않는다
- 코드를 쓰게 하기 전에 **계획을 먼저 받고**(Plan 모드) 이해한 뒤 진행한다
- 변경마다 "무엇을 하고 어떤 보안 처리를 했는지" 설명을 받는다
- **자기가 설명하지 못하는 코드는 머지하지 않는다.** 진단에서 약점이 나왔을 때 원인을 찾고 고칠 수 있어야 한다
- 처음 하는 기능은 기준 코드(백엔드 기준 API, FE1의 공통 컴포넌트)를 참고하라고 지시한다
- 작업 전에 문서를 읽으라고 매번 시킬 필요는 없다. `CLAUDE.md`와 거기서 `@`로 연결한 규칙 문서는 세션을 시작할 때 자동으로 읽힌다. 큰 문서(`docs/security.md`, `docs/erd.md`)는 자동으로 읽히지 않으니, 그 문서가 필요한 작업(인증, 권한, 모델 변경 등)을 시킬 때만 "docs/security.md 3-1을 따라서"처럼 해당 부분을 짚어 준다
