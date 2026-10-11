import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const storageMessage =
  "브라우저 저장소에 로그인 정보·개인정보를 저장하지 않는다.";

export default defineConfig([
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // 코드 삽입
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // 남은 디버그 코드, 오류 메시지 노출
      "no-console": "error",
      "no-debugger": "error",
      "no-alert": "error",

      // 오류 상황 대응 부재
      "no-empty": ["error", { allowEmptyCatch: false }],

      // Null 역참조·타입 우회
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // 중요정보 저장
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: storageMessage },
        { name: "sessionStorage", message: storageMessage },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "localStorage", message: storageMessage },
        { object: "window", property: "sessionStorage", message: storageMessage },
        { object: "document", property: "cookie", message: "인증 쿠키는 서버가 관리한다(HttpOnly)." },
        { object: "document", property: "write", message: "XSS 위험: JSX 텍스트로 출력한다." },
        { object: "Math", property: "random", message: "보안 용도에는 crypto.getRandomValues를 쓴다." },
      ],

      // XSS, 신뢰되지 않는 URL
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "XSS 위험: dangerouslySetInnerHTML 금지. 텍스트로 출력한다.",
        },
        {
          selector: "MemberExpression[property.name=/^(innerHTML|outerHTML)$/]",
          message: "XSS 위험: innerHTML·outerHTML 금지.",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "XSS 위험: insertAdjacentHTML 금지.",
        },
        {
          selector: "JSXOpeningElement[name.name='a'] > JSXAttribute[name.name='target']",
          message: "외부 링크는 shared/ui/SafeExternalLink를 쓴다.",
        },
        {
          selector: "CallExpression[callee.object.name='window'][callee.property.name='open']",
          message: "외부 링크는 shared/ui/SafeExternalLink를 쓴다.",
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message: "API 호출은 shared/api/client.ts만 쓴다(CSRF 헤더 자동 첨부).",
        },
      ],
    },
  },
  {
    // SafeExternalLink는 외부 링크 규칙을 구현하는 유일한 곳이다.
    files: ["src/shared/ui/SafeExternalLink.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);
