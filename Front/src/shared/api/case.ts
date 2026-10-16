// 백엔드 snake_case ↔ 프론트 camelCase (apiClient에서만 사용)
const snakeToCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
const camelToSnake = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

// JSON 객체만 변환 (FormData·Blob 등은 그대로)
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function convertKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convert));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  // fromEntries: "__proto__" 키도 일반 속성으로 (프로토타입 변경 X)
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [convert(key), convertKeys(item, convert)]),
  );
}

export const toCamelKeys = (value: unknown): unknown => convertKeys(value, snakeToCamel);
export const toSnakeKeys = (value: unknown): unknown => convertKeys(value, camelToSnake);
