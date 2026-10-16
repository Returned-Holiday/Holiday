# 프론트 API 연동 규칙

**요청·응답 필드의 확정본은 `docs/api.md`다.** 이 문서는 프론트가 먼저 제안했던 필드 목록이었고, `docs/api.md` 엔드포인트 상세가 생긴 뒤 프론트가 응답을 어떻게 받는지만 남겼다. 필드가 바뀌면 `docs/api.md`를 고치고 프론트 `features/*/api.ts`·`types.ts`를 맞춘다.

## 필드 이름 변환 (10/16 FE1 결정)

- 백엔드는 snake_case로 주고받는다. 프론트 코드는 camelCase로 쓴다.
- 변환은 `Front/src/shared/api/client.ts`의 `apiClient` 인터셉터 한 곳에서만 한다(`shared/api/case.ts`).
  - 요청: body·query params 키 → snake_case (`agreeTerms` → `agree_terms`)
  - 응답: body 키 → camelCase (`password_changed_at` → `passwordChangedAt`)
  - 에러: `fields` 키도 camelCase (`fields.agree_terms` → `fields.agreeTerms`)
- 키만 바꾸고 값은 바꾸지 않는다(`"PAYMENT_LINKED"` 같은 enum 값은 그대로).
- `FormData`(OCR 업로드)는 변환하지 않는다.
- 그래서 `features/*/api.ts`·`types.ts`와 화면 코드에는 snake_case가 나오지 않는다. `docs/api.md`의 `company_name`은 프론트에서 `companyName`이다.

## 응답 형식

- 성공 응답은 목록을 포함해 전부 `{ "data": ... }`로 감싸서 온다. 204와 에러는 감싸지 않는다(`docs/rules/api-response.md`).
  - 단건: `body.data`를 타입 가드로 검사한다.
  - 목록: `{ data: { count, next, previous, results } }`. `shared/lib/guards.ts`의 `readPaginated`가 `data`를 벗기고 검사한다.
- 에러는 `{ code, message, fields }`. `ApiError`로 받아 `message`만 보여준다.
- 프론트는 모든 응답을 형식 검사(타입 가드)한 뒤 쓴다. 형식이 다르면 "불러오지 못했어요" 화면이 뜬다.
- 날짜는 `YYYY-MM-DD`, 시각은 ISO 8601.

## 화면 처리 규칙

- 401은 세션 만료로 보고 화면 데이터를 비운다. 단 `/auth/me/`, `/auth/login/`, `/auth/csrf/`의 401은 제외(비로그인·로그인 실패).
- 로그인 잠금은 `ACCOUNT_LOCKED`(429) `message`를 그대로 보여준다.
- 앱 시작 시 `GET /auth/csrf/`로 CSRF 쿠키를 받는다. 가입·로그인 POST도 CSRF 검사 대상이다.
- 로그인 성공 후 `/auth/me/`를 다시 조회해 상태를 채운다. `passwordExpired`가 `true`면 비밀번호 변경 화면으로 보낸다.
- 닉네임은 서버와 같은 규칙으로 미리 검사한다: 한글·영문·숫자 2~20자.
- 체크리스트: 1~3순위는 "지금 바로 하세요", 4~5순위는 "여유가 될 때 하세요"로 묶는다. `summary`가 `null`이면 줄을 생략한다. `reason` 문구는 서버가 만든 그대로 보여준다(트리거를 프론트가 해석하지 않음).
