import { useState, type SubmitEvent } from "react";
import { ApiError } from "../../shared/api/errors";
import { todayDateValue, toSafeHttpsUrl } from "../../shared/lib/validators";
import { COMPANY_NAME_MAX, createReport, LEAK_ITEMS_MAX } from "./api";

type Field = "companyName" | "sourceUrl" | "notifiedAt" | "leakItemsText";
type Errors = Partial<Record<Field, string>>;

const RATE_LIMITED_MESSAGE = "제보는 하루에 5번까지 할 수 있어요. 내일 다시 시도해 주세요.";

export function useReportForm() {
  const [values, setValues] = useState<Record<Field, string>>({
    companyName: "",
    sourceUrl: "",
    notifiedAt: "",
    leakItemsText: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (field: Field, source: Record<Field, string> = values): string | undefined => {
    const value = source[field].trim();
    switch (field) {
      case "companyName":
        if (value === "") return "기업명을 입력해 주세요.";
        return value.length > COMPANY_NAME_MAX ? `${COMPANY_NAME_MAX}자 이하로 입력해 주세요.` : undefined;
      case "sourceUrl":
        // https만 (서버도 검증, 서버는 이 URL에 접속 X)
        return toSafeHttpsUrl(value) ? undefined : "https:// 로 시작하는 공식 페이지 주소를 입력해 주세요";
      case "notifiedAt":
        if (value === "") return undefined;
        if (Number.isNaN(new Date(value).getTime())) return "날짜를 확인해 주세요.";
        // YYYY-MM-DD는 문자열 비교 = 날짜 비교
        return value > todayDateValue() ? "공지일은 오늘 이후로 적을 수 없어요." : undefined;
      case "leakItemsText":
        if (value === "") return "공지에 적힌 유출 항목을 적어 주세요.";
        return value.length > LEAK_ITEMS_MAX ? `${LEAK_ITEMS_MAX}자 이하로 입력해 주세요.` : undefined;
    }
  };

  // 에러가 떠 있는 칸은 입력할 때마다 다시 검사 (맞으면 바로 지움)
  const setValue = (field: Field, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    setErrors((shown) => (shown[field] ? { ...shown, [field]: validate(field, next) } : shown));
  };
  const touch = (field: Field) => setErrors((current) => ({ ...current, [field]: validate(field) }));

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields: Field[] = ["companyName", "sourceUrl", "notifiedAt", "leakItemsText"];
    const next: Errors = {};
    for (const field of fields) {
      next[field] = validate(field);
    }
    setErrors(next);
    if (fields.some((field) => next[field])) {
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      await createReport({
        companyName: values.companyName.trim(),
        sourceUrl: values.sourceUrl.trim(),
        notifiedAt: values.notifiedAt === "" ? null : values.notifiedAt,
        leakItemsText: values.leakItemsText.trim(),
      });
      setDone(true);
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setErrors({
        companyName: caught.fields.companyName?.[0],
        sourceUrl: caught.fields.sourceUrl?.[0],
        notifiedAt: caught.fields.notifiedAt?.[0],
        leakItemsText: caught.fields.leakItemsText?.[0],
      });
      setFormError(caught.code === "RATE_LIMITED" ? RATE_LIMITED_MESSAGE : caught.message);
    } finally {
      setPending(false);
    }
  };

  return { values, setValue, errors, touch, formError, pending, done, submit };
}
