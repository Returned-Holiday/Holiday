// 초안: 팀 검토 후 확정 (출처는 기관 대표 주소)
export type FaqSource = {
  label: string;
  url: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  source: FaqSource;
};

export type FaqCategory = {
  id: string;
  label: string;
  description: string;
  items: FaqItem[];
};

const KISA: FaqSource = { label: "KISA 보호나라", url: "https://www.boho.or.kr" };
const PIPC: FaqSource = { label: "개인정보보호위원회", url: "https://www.pipc.go.kr" };
const MSIT: FaqSource = { label: "과학기술정보통신부", url: "https://www.msit.go.kr" };
const POLICE: FaqSource = { label: "경찰청 사이버범죄 신고시스템", url: "https://ecrm.police.go.kr" };
const FSS: FaqSource = { label: "금융감독원", url: "https://www.fss.or.kr" };
const MSAFER: FaqSource = { label: "명의도용방지서비스(엠세이퍼)", url: "https://www.msafer.or.kr" };

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "misconceptions",
    label: "잘못 알려진 대응법",
    description: "사고가 나면 SNS에 대응법이 빠르게 퍼져요. 그중 공식 자료와 다른 내용을 정리했어요.",
    items: [
      {
        id: "usim-pin",
        question: "유심(USIM) PIN을 설정하면 유출 피해를 막을 수 있나요?",
        answer:
          "통신사 서버에서 유출된 사고에는 직접적인 대응책이 아니에요. 유심 PIN은 유심을 잃어버리거나 빼앗겼을 때를 대비하는 기능이에요. 초기 비밀번호를 잘못 입력하면 유심이 잠길 수 있으니, 통신사의 유심 보호 서비스를 먼저 확인하세요.",
        source: MSIT,
      },
      {
        id: "notice-link",
        question: "유출 안내 문자 속 링크를 눌러 확인해도 되나요?",
        answer:
          "사고 직후에는 기업을 사칭한 문자가 함께 늘어나요. 문자 속 링크를 누르기보다 기업 공식 홈페이지나 앱에 직접 들어가 확인하세요. 이미 눌렀다면 앱 설치나 정보 입력은 하지 말고 KISA 118에 상담하세요.",
        source: KISA,
      },
      {
        id: "change-phone-number",
        question: "휴대폰 번호를 바꿔야 하나요?",
        answer:
          "번호가 유출됐다는 이유만으로 번호를 바꿀 필요는 대개 없어요. 다만 스팸과 사칭 연락이 늘 수 있으니 스팸 차단 기능을 켜고, 모르는 번호가 보낸 링크는 열지 마세요. 피해가 이어지면 통신사 고객센터에 상담하세요.",
        source: KISA,
      },
      {
        id: "password-not-leaked",
        question: "비밀번호는 유출 안 됐다는데, 그래도 바꿔야 하나요?",
        answer:
          "해당 서비스의 비밀번호가 유출되지 않았다면 급하게 바꿀 필요는 없어요. 하지만 유출된 다른 정보로 로그인을 시도하는 공격이 늘 수 있어요. 같은 비밀번호를 여러 사이트에서 쓰고 있다면 바꾸고, 2단계 인증을 켜 두세요.",
        source: PIPC,
      },
    ],
  },
  {
    id: "check-leak",
    label: "유출 확인 방법",
    description: "내 정보가 정말 유출됐는지, 어디서 확인하는지 정리했어요.",
    items: [
      {
        id: "how-to-check",
        question: "내 정보가 유출됐는지 어떻게 확인하나요?",
        answer:
          "개인정보가 유출되면 기업은 이용자에게 알려야 해요. 기업이 보낸 문자·메일을 확인하거나, 기업 공식 홈페이지의 조회 페이지에서 직접 확인하세요. SEALD의 사고 상세에서도 기업이 발표한 유출 항목을 볼 수 있어요.",
        source: PIPC,
      },
      {
        id: "notice-contents",
        question: "유출 통지에는 어떤 내용이 들어 있어야 하나요?",
        answer:
          "유출된 개인정보 항목, 유출 시점과 경위, 피해를 줄이는 방법, 기업의 대응 조치와 피해 구제 절차, 상담받을 부서와 연락처가 들어 있어야 해요. 빠진 내용이 있다면 기업 상담센터에 문의하세요.",
        source: PIPC,
      },
      {
        id: "identity-theft",
        question: "내 명의로 휴대폰이 개통됐는지 확인할 수 있나요?",
        answer:
          "명의도용방지서비스(엠세이퍼)에서 내 명의로 가입된 통신 서비스를 조회하고, 새로 가입하는 것을 막을 수 있어요.",
        source: MSAFER,
      },
    ],
  },
  {
    id: "smishing",
    label: "사칭·스미싱 구별",
    description: "유출 사고 뒤에 늘어나는 사칭 연락을 구별하는 방법이에요.",
    items: [
      {
        id: "smishing-signs",
        question: "사칭 문자는 어떻게 구별하나요?",
        answer:
          "링크를 눌러 확인하라고 하거나, 앱 설치를 요구하거나, 급한 결제·환불·보상을 안내하는 문자는 의심하세요. 기업과 기관은 문자나 전화로 비밀번호·인증번호를 묻지 않아요.",
        source: KISA,
      },
      {
        id: "clicked-link",
        question: "의심 문자의 링크를 눌렀거나 앱을 설치했어요.",
        answer:
          "휴대폰의 데이터와 와이파이를 끄고, 설치한 앱을 지운 뒤 백신으로 검사하세요. 금융 정보를 입력했다면 바로 금융회사에 연락해 거래를 막고, KISA 118에 상담하세요.",
        source: KISA,
      },
    ],
  },
  {
    id: "report-channels",
    label: "신고·상담 기관",
    description: "상황에 따라 연락할 곳이 달라요. 피해가 생겼다면 빠르게 연락하세요.",
    items: [
      {
        id: "kisa-118",
        question: "개인정보 침해나 사칭 문자는 어디에 신고하나요?",
        answer: "한국인터넷진흥원(KISA) 개인정보침해 신고센터에 국번 없이 118로 전화하거나 보호나라에서 신고할 수 있어요.",
        source: KISA,
      },
      {
        id: "police",
        question: "돈을 잃는 피해를 입었어요.",
        answer:
          "먼저 이용한 금융회사에 연락해 지급 정지를 요청하세요. 그다음 경찰청 사이버범죄 신고시스템이나 112에 신고하세요.",
        source: POLICE,
      },
      {
        id: "financial",
        question: "금융 피해 상담은 어디서 받나요?",
        answer: "금융감독원 콜센터(국번 없이 1332)에서 금융 피해 상담과 구제 절차 안내를 받을 수 있어요.",
        source: FSS,
      },
    ],
  },
  {
    id: "glossary",
    label: "용어 풀이",
    description: "유출 공지에 자주 나오는 어려운 말을 쉽게 풀었어요.",
    items: [
      {
        id: "term-imsi",
        question: "IMSI(가입자식별번호)가 뭔가요?",
        answer: "통신사가 내 유심을 구분하려고 붙인 고유 번호예요.",
        source: MSIT,
      },
      {
        id: "term-usim-key",
        question: "유심 인증키가 뭔가요?",
        answer: "통신망이 그 유심이 진짜인지 확인할 때 쓰는 열쇠 같은 값이에요.",
        source: MSIT,
      },
      {
        id: "term-imei",
        question: "IMEI가 뭔가요?",
        answer: "휴대폰 기기마다 붙은 고유 번호예요. 유심이 아니라 기기를 구분해요.",
        source: MSIT,
      },
      {
        id: "term-2fa",
        question: "2단계 인증이 뭔가요?",
        answer: "비밀번호에 더해 휴대폰 앱이나 인증번호로 한 번 더 확인하는 방식이에요. 비밀번호가 알려져도 로그인을 막아 줘요.",
        source: KISA,
      },
    ],
  },
];

export type FaqHighlight = {
  id: string;
  question: string;
};

const HIGHLIGHT_IDS = ["usim-pin", "notice-link", "change-phone-number", "password-not-leaked"];

export const FAQ_HIGHLIGHTS: FaqHighlight[] = FAQ_CATEGORIES.flatMap((category) => category.items)
  .filter((item) => HIGHLIGHT_IDS.includes(item.id))
  .map(({ id, question }) => ({ id, question }));

export function faqAnchor(id: string): string {
  return `faq-${id}`;
}

// #faq-{질문 또는 분류 id} → 분류·질문
export function resolveFaqHash(hash: string): { categoryId: string; itemId: string | null } | null {
  const id = hash.replace(/^#faq-/, "");
  if (id === hash) {
    return null;
  }
  for (const category of FAQ_CATEGORIES) {
    if (category.id === id) {
      return { categoryId: category.id, itemId: null };
    }
    if (category.items.some((item) => item.id === id)) {
      return { categoryId: category.id, itemId: id };
    }
  }
  return null;
}
