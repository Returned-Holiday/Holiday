const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "IMSI", meaning: "IMSI는 통신사가 내 유심을 구분하는 고유 번호" },
  { term: "유심 인증키", meaning: "유심 인증키는 그 유심이 진짜인지 확인하는 열쇠" },
  { term: "IMEI", meaning: "IMEI는 휴대폰 기기마다 붙은 고유 번호" },
  { term: "CI", meaning: "CI는 본인확인 기관이 사람마다 부여하는 연계정보" },
];

export function explainTerms(labels: string[]): string | null {
  const meanings = GLOSSARY.filter(({ term }) => labels.some((label) => label.includes(term))).map(
    ({ meaning }) => meaning,
  );
  if (meanings.length === 0) {
    return null;
  }
  return `${meanings.join(", ")}예요.`;
}

const SHORT_MEANINGS: { term: string; meaning: string }[] = [
  { term: "IMSI", meaning: "유심을 구분하는 고유 번호" },
  { term: "유심 인증키", meaning: "유심이 진짜인지 확인하는 열쇠" },
  { term: "IMEI", meaning: "휴대폰 기기의 고유 번호" },
  { term: "CI", meaning: "본인확인용 연계정보" },
];

export function shortMeaning(label: string): string | null {
  return SHORT_MEANINGS.find(({ term }) => label.includes(term))?.meaning ?? null;
}
