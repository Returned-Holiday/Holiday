# Front — React 프론트엔드

React 19 + TypeScript(strict) + Vite, React Router, Zustand, styled-components, axios. 담당: FE1, FE2.
프론트엔드 코드도 대회 진단 대상이다.

시큐어코딩 규칙: @../docs/rules/secure-ts.md

## 폴더 구조
```
src/
├─ main.tsx
├─ app/          App, providers(테마), router(전체 경로), paths(경로 상수), guards/RequireAuth·RequireAdmin
├─ pages/        라우트 1개 = 파일 1개. 조립만 하고 로직은 features에 둔다
│  ├─ public/    메인, 사고 상세, FAQ, 처리방침, 404
│  ├─ auth/      로그인, 회원가입, 비밀번호 변경
│  ├─ member/    OCR, 설문, 체크리스트, 제보, 마이페이지          (FE1 중심)
│  └─ admin/     OTP, 사고, 기업, 조치, 제보 검수 — /manage 아래 (FE2)
├─ features/     도메인별 api.ts · types.ts · components/ · hooks/
│                (auth, incident, ocr, survey, checklist, report, mypage, admin)
├─ shared/
│  ├─ api/       client.ts(axios, CSRF·쿠키·에러 일원화), errors.ts
│  ├─ ui/        SafeExternalLink, ErrorBoundary, 공통 컴포넌트
│  ├─ lib/       validators(https URL, 내부 경로)
│  ├─ hooks/
│  └─ types/
└─ styles/       theme(디자인 토큰), GlobalStyle, styled.d.ts
```
- 화면 목록·경로는 `docs/features.md`, API는 `docs/api.md`와 맞춘다. 경로 문자열은 `app/paths.ts` 상수를 쓴다.
- 관리자 화면: `RequireAdmin` 아래에 두고 `lazy`로 불러온다. 관리자가 아니면 404, OTP 인증 전이면 `/manage/otp`로 보낸다. 일반 화면에 관리자 링크를 두지 않는다. 실제 보호는 서버(허용 IP, `is_staff`, OTP)다.

## 반드시 지킬 것
- API 호출은 `features/<도메인>/api.ts`에서 `shared/api/client.ts`의 `apiClient`만 쓴다. `fetch`·새 axios 인스턴스 금지.
- 에러는 `ApiError`로 받아 `message`(일반 문구)만 보여준다. 에러 원문·스택을 화면에 내지 않는다.
- 외부 링크는 `SafeExternalLink`만. 로그인 후 돌아갈 경로는 `isSafeInternalPath`로 검사한다.
- 로그인 상태는 `useAuthStore`(메모리)에만. `persist`·브라우저 저장소 금지.
- 서버 데이터(요약, 반려 사유 등)는 항상 텍스트로 렌더링한다.
- 라우트 가드는 편의용이다. 권한 판단의 근거로 문서에 쓰지 않는다(실제 보호는 서버).
- 새 패키지는 BE1 승인 후 `npm install --save-exact`로 추가하고 `package-lock.json`을 함께 커밋한다.

## 명령어
```bash
npm ci              # 의존성 설치 (lock 파일 기준, 처음 받았을 때)
npm run dev         # 개발 서버 http://localhost:5173 (/api는 127.0.0.1:8000으로 프록시)
npm run typecheck   # 타입 검사
npm run lint        # ESLint(보안 규칙 포함)
npm run build       # 운영 빌드(소스맵 없음)
npm audit           # 의존성 취약점 점검
```
PR 전에 `typecheck`, `lint`, `build`가 모두 통과해야 한다.
