import type { PolicyDocumentData } from "./types";

// 초안: 팀·법령 검토 후 확정. 보관 기간은 docs/security.md 3-6
export const PRIVACY_POLICY: PolicyDocumentData = {
  title: "개인정보처리방침",
  effectiveDate: "2026.10.28",
  lead: "피해자를 돕는 서비스가 새로운 유출 경로가 되지 않도록, 최소한으로 수집하고 바로 지웁니다.",
  highlights: [
    "이메일 · 비밀번호 · 닉네임만 받아요",
    "통지문 이미지는 저장하지 않고 분석 직후 삭제해요",
    "탈퇴하면 회원 정보와 기록을 바로 삭제해요",
  ],
  sections: [
    {
      id: "items",
      title: "제1조  처리하는 개인정보 항목과 목적",
      body: {
        kind: "table",
        columns: [
          { label: "구분", width: 190 },
          { label: "항목", width: 320 },
          { label: "목적", width: 328 },
        ],
        rows: [
          ["회원가입", "이메일, 비밀번호, 닉네임", "회원 식별, 로그인"],
          ["맞춤 대응 가이드", "설문 응답, 조치 완료 기록", "체크리스트 생성, 진행률 저장"],
          ["사고 제보", "기업명, 공식 출처 URL, 공지일, 유출 항목", "제보 검수, 결과 안내"],
          ["문자 캡처 인식", "통지문 이미지 (저장 안 함)", "유출 사고·항목 매칭"],
        ],
      },
    },
    {
      id: "retention",
      title: "제2조  보유 기간과 파기",
      body: {
        kind: "table",
        columns: [
          { label: "항목", width: 300 },
          { label: "보유 기간", width: 220 },
          { label: "파기 방법", width: 318 },
        ],
        rows: [
          ["회원 정보, 진행 기록, 제보 내역", "탈퇴 시까지", "탈퇴 즉시 삭제"],
          ["통지문 이미지·추출 텍스트", "분석이 끝날 때까지", "메모리에서 즉시 파기"],
          ["접속 기록·보안 로그", "90일 (관리자 접속 기록 1년)", "기간 만료 시 자동 삭제"],
        ],
      },
    },
    {
      id: "outsourcing",
      title: "제3조  처리 위탁",
      body: {
        kind: "table",
        columns: [
          { label: "수탁자", width: 290 },
          { label: "위탁 업무", width: 270 },
          { label: "비고", width: 278 },
        ],
        rows: [
          ["네이버클라우드 (CLOVA OCR)", "통지문 텍스트 추출", "HTTPS 암호화 전송"],
          ["Amazon Web Services", "서버·DB 운영", "서울 리전"],
        ],
      },
    },
    {
      id: "third-party",
      title: "제4조  제3자 제공",
      collapsed: true,
      body: {
        kind: "text",
        paragraphs: [
          "SEALD는 이용자의 개인정보를 제3자에게 제공하지 않습니다.",
          "다만 법령에 따라 수사기관 등이 적법한 절차로 요청하는 경우에는 법령이 정한 범위에서만 제공합니다.",
        ],
      },
    },
    {
      id: "safeguards",
      title: "제5조  안전성 확보 조치",
      collapsed: true,
      body: {
        kind: "numbered",
        items: [
          "비밀번호는 복원할 수 없는 방식(PBKDF2 해시)으로만 저장합니다.",
          "모든 통신은 HTTPS(TLS 1.2 이상)로 암호화합니다.",
          "관리자 기능은 허용된 IP와 2차 인증을 거친 관리자만 쓸 수 있습니다.",
          "데이터베이스는 외부에서 직접 접근할 수 없는 곳에 두고 저장소를 암호화합니다.",
          "제보에 들어온 전화번호·이메일·주민등록번호·카드번호·계좌번호는 저장 전에 가립니다.",
          "관리자 접속·처리 기록을 1년간 보관하고 매월 점검합니다.",
        ],
      },
    },
    {
      id: "rights",
      title: "제6조  이용자의 권리와 행사 방법",
      collapsed: true,
      body: {
        kind: "text",
        paragraphs: [
          "이용자는 언제든지 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요구할 수 있습니다.",
          "마이페이지에서 계정 정보와 진행 기록을 확인할 수 있고, 사고별 대응 기록 삭제와 회원 탈퇴를 직접 할 수 있습니다. 그 밖의 요청은 제8조의 개인정보 보호책임자에게 연락해 주세요.",
        ],
      },
    },
    {
      id: "cookies",
      title: "제7조  쿠키",
      collapsed: true,
      body: {
        kind: "text",
        paragraphs: [
          "SEALD는 로그인 상태를 유지하는 세션 쿠키와 위조 요청을 막는 보안 쿠키만 사용합니다. 광고·분석용 쿠키는 쓰지 않습니다.",
          "브라우저 설정에서 쿠키를 거부할 수 있지만, 이 경우 로그인이 필요한 기능은 쓸 수 없습니다.",
        ],
      },
    },
    {
      id: "officer",
      title: "제8조  개인정보 보호책임자",
      collapsed: true,
      body: {
        kind: "text",
        paragraphs: [
          "개인정보 보호책임자: 반납한연휴 팀",
          "개인정보 침해에 대한 신고나 상담이 필요하면 개인정보침해 신고센터(국번 없이 118)에도 문의할 수 있습니다.",
        ],
      },
    },
    {
      id: "changes",
      title: "제9조  방침의 변경",
      collapsed: true,
      body: {
        kind: "text",
        paragraphs: [
          "이 방침을 바꿀 때는 시행 7일 전부터 서비스 화면에 알립니다. 이용자 권리에 중요한 변경은 30일 전부터 알립니다.",
        ],
      },
    },
  ],
};
