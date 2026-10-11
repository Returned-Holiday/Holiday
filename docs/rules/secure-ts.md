# 프론트엔드(React·TypeScript) 시큐어코딩 규칙

프론트엔드 코드도 진단 대상이다. 진단가이드 49개 중 TS에 해당하는 항목을 규칙으로 옮겼다. **프론트의 검사는 사용성을 위한 것이고, 실제 보호는 서버가 맡는다.** 프론트 검사만으로 보안이 된다고 쓰지 않는다.

## 바로 외울 금지 목록 (ESLint로 강제)

| 금지 | 대신 | 약점 |
|---|---|---|
| `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write` | JSX 텍스트 출력(자동 이스케이프) | XSS |
| `eval`, `new Function`, 문자열을 넘기는 `setTimeout`·`setInterval` | 일반 함수 | 코드 삽입 |
| `<a href={사용자값}>`, `window.open(사용자값)`, `location.href = 사용자값` | `SafeExternalLink`(https만, `noopener noreferrer`) | 신뢰되지 않는 URL 자동접속 |
| `Math.random()` (보안 용도) | `crypto.getRandomValues` (프론트에서 보안 난수가 필요한 일은 원칙적으로 없음) | 적절하지 않은 난수 |
| `localStorage`·`sessionStorage`에 로그인 정보, 개인정보, OCR 결과 저장 | 서버 세션 + 메모리 상태 | 중요정보 저장 |
| `document.cookie`로 인증 정보 다루기 | 쿠키는 서버가 관리(HttpOnly) | 쿠키 정보 노출 |
| `console.log`, `console.error`, `debugger` | 제거. 에러는 ErrorBoundary가 일반 화면으로 | 남은 디버그 코드 |
| `alert(error.message)`, 서버 에러 원문 표시 | 공통 에러 문구 | 오류 메시지 정보노출 |
| 빈 `catch {}` | 사용자에게 알리거나 상위로 다시 던짐 | 오류 상황 대응 부재 |
| `VITE_`로 시작하는 변수에 비밀값 | 비밀값은 프론트에 두지 않음 | 하드코드된 중요정보 |
| 외부 CDN `<script>` | npm 패키지로 번들 | 무결성 검사 없는 코드 다운로드 |
| `any` 남용, `// @ts-ignore` | 정확한 타입, `unknown` 후 검사 | Null 역참조 |

## 49개 중 프론트 해당 항목

| 분류 | 약점 | 규칙 |
|---|---|---|
| 입력 | XSS | 위 금지 목록. 서버 데이터(제보 사유, 요약 등)도 항상 텍스트로 출력 |
| 입력 | 코드 삽입 | `eval`류 금지 |
| 입력 | 신뢰되지 않는 URL 자동접속 | 외부 링크는 `SafeExternalLink`만. `navigate()`에 사용자 입력 경로 금지 |
| 입력 | CSRF | API 호출은 `shared/api/client.ts`만 사용(CSRF 헤더 자동 첨부). `fetch` 직접 호출 금지 |
| 입력 | 보안기능 결정에 사용되는 부적절한 입력값 | 역할·권한은 서버 응답(`/auth/me`)으로만 판단. 라우트 가드는 편의용이고 실제 보호는 서버 |
| 입력 | 정수형 오버플로 | 숫자 입력은 범위를 검사하고 서버가 다시 검증 |
| 보안기능 | 하드코드된 중요정보 | 키·토큰·내부 주소를 코드와 `VITE_` 변수에 두지 않음 |
| 보안기능 | 사용자 하드디스크에 저장되는 쿠키 | 인증 정보는 HttpOnly 세션 쿠키만 |
| 보안기능 | 주석문 안의 주요정보 | 주석에 계정·내부 주소·API 키 금지. 운영 빌드 소스맵 끔 |
| 보안기능 | 무결성 검사 없는 코드 다운로드 | CDN 미사용, `npm ci` + lock 파일 |
| 보안기능 | 중요정보 저장·전송 | 비밀번호는 폼 상태에만, 전송 후 초기화. `autocomplete` 적절히 지정 |
| 에러 | 오류 메시지 정보노출 | 공통 에러 문구, ErrorBoundary |
| 에러 | 오류 상황 대응 부재·부적절한 예외 처리 | 빈 `catch` 금지. `catch (e)`에서는 알려진 에러 형식만 처리하고 나머지는 상위로 |
| 코드오류 | Null 역참조 | `strict: true`, 옵셔널 체이닝, API 응답 타입 검사 |
| 코드오류 | 부적절한 자원 해제 | `URL.createObjectURL` 후 `revokeObjectURL`, `useEffect` 정리 함수로 구독·타이머 해제 |
| 코드오류 | 역직렬화 | `JSON.parse` 결과는 타입 검사 후 사용 |
| 캡슐화 | 남은 디버그 코드 | `console`, `debugger`, 테스트용 화면·라우트 금지 |
| 캡슐화 | Private 배열 반환·할당 | 상태는 불변으로 다룸(복사 후 수정) |
| 시간·상태 | 종료되지 않는 반복 | `useEffect` 의존성 배열 확인, 재시도는 횟수 제한 |
| API 오용 | 취약한 API | 위 금지 목록 |

## 구조 규칙
- API 호출: `features/<도메인>/api.ts` → `shared/api/client.ts`만 사용
- 외부 링크: `shared/ui/SafeExternalLink.tsx`만 사용
- 로그인 상태: 앱 시작 시 `/auth/me`로 확인, 전역 상태(Zustand)에는 메모리로만(`persist` 금지)
- OCR 업로드: 형식·크기 검사는 사용성용. 미리보기 URL은 사용 후 해제, 이미지를 상태 저장소에 두지 않음
- 운영 빌드: `sourcemap: false`

## 리뷰에서 반드시 보는 것
- [ ] 사용자·서버 데이터가 HTML로 렌더링되는 곳이 없는가
- [ ] 외부 링크가 `SafeExternalLink`를 쓰는가
- [ ] 브라우저 저장소에 민감정보가 없는가
- [ ] 에러를 삼키거나 원문으로 보여주는 곳이 없는가
- [ ] `console`·`debugger`가 없는가
