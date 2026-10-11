## 무엇을
<!-- 이 PR이 하는 일 1~2줄 -->

## 어떤 보안 처리로
<!-- 서비스 개요서·발표자료 재료가 된다. 예: 소유 필터로 IDOR 차단, 저장 전 마스킹 -->

## 관련
<!-- 기능명세서 화면, API, 이슈 번호. 약점 조치면 Closes #번호 -->

## 체크리스트
### 공통
- [ ] 디버그 코드(`print`, `console.log`, `debugger`), 주석 처리된 코드, TODO 주석이 없다
- [ ] 비밀값(키, 비밀번호, 토큰)이 코드·테스트·주석에 없다
- [ ] 에러 응답·화면에 내부 정보(스택, 쿼리, 예외 원문)가 없다
- [ ] 로그에 개인정보가 없다
- [ ] 내가 이 코드를 설명할 수 있다

### 백엔드
- [ ] 새 뷰에 권한이 명시되어 있다(공개 API만 `AllowAny`)
- [ ] 사용자 데이터는 `request.user`로, 사고·조치는 공개 매니저로 조회한다
- [ ] 입력은 serializer에서 타입·길이·형식을 검증한다
- [ ] 금지 API(`docs/rules/secure-python.md`)를 쓰지 않았다
- [ ] 모델을 바꿨다면 `docs/erd.md`도 고쳤다

### 프론트
- [ ] API 호출은 `apiClient`만, 외부 링크는 `SafeExternalLink`만 쓴다
- [ ] 서버·사용자 데이터를 HTML로 렌더링하지 않는다
- [ ] 브라우저 저장소에 민감정보가 없다
- [ ] `typecheck`, `lint`, `build`가 통과한다

### 문서
- [ ] 새 API·화면이면 `docs/api.md`·`docs/features.md`를 고쳤다
- [ ] 정책 값을 바꿨다면 `docs/security.md`, `docs/project/decisions.md`를 고쳤다
