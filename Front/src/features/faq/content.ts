export type FaqHighlight = {
  id: string;
  question: string;
};

export const FAQ_HIGHLIGHTS: FaqHighlight[] = [
  { id: "usim-pin", question: "유심 PIN을 설정하면 피해를 막을 수 있나요?" },
  { id: "notice-link", question: "안내 문자 속 링크를 눌러도 되나요?" },
  { id: "change-phone-number", question: "휴대폰 번호를 바꿔야 하나요?" },
  { id: "password-not-leaked", question: "비밀번호는 유출 안 됐다는데 바꿔야 하나요?" },
];

export function faqAnchor(id: string): string {
  return `faq-${id}`;
}
