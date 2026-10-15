from django.test import SimpleTestCase

from common.masking import mask_pii


class MaskPiiTests(SimpleTestCase):
    def assert_masked(self, cases: tuple[tuple[str, str], ...]) -> None:
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(mask_pii(raw), expected)

    def test_resident_number(self) -> None:
        self.assert_masked(
            (
                ("900101-1234567", "900101-1******"),
                ("9001011234567", "9001011******"),
            )
        )

    def test_card_number(self) -> None:
        self.assert_masked(
            (
                ("1234-5678-9012-3456", "1234-56**-****-3456"),
                ("1234 5678 9012 3456", "1234 56** **** 3456"),
                ("1234567890123456", "123456******3456"),
            )
        )

    def test_phone_number(self) -> None:
        self.assert_masked(
            (
                ("010-1234-5678", "010-1234-****"),
                ("01012345678", "0101234****"),
                ("02-123-4567", "02-123-****"),
                ("031-1234-5678", "031-1234-****"),
            )
        )

    def test_account_number(self) -> None:
        self.assert_masked(
            (
                ("123-456-789012", "123-456-7*****"),
                ("1002-345-678901", "1002-345-6*****"),
                ("12345678901234", "123456789*****"),
            )
        )

    def test_email(self) -> None:
        self.assert_masked(
            (
                ("abcdef@naver.com", "ab****@naver.com"),
                ("ab@example.com", "a*@example.com"),
                ("a@example.com", "*@example.com"),
                ("01012345678@example.com", "01*********@example.com"),
            )
        )

    def test_mixed_text(self) -> None:
        raw = "홍길동 010-1234-5678, hong@test.com 으로 연락. 카드 1234-5678-9012-3456"
        expected = "홍길동 010-1234-****, ho**@test.com 으로 연락. 카드 1234-56**-****-3456"
        self.assertEqual(mask_pii(raw), expected)

    def test_keeps_text_without_pii(self) -> None:
        for raw in (
            "이름, 휴대전화번호, 이메일 주소가 유출됐다고 합니다",
            "공지일 2025-04-28, 영향 인원 2,300만 명",
            "유심 인증키(Ki) 유출 의심",
            "",
        ):
            with self.subTest(raw=raw):
                self.assertEqual(mask_pii(raw), raw)

    def test_long_input_finishes(self) -> None:
        for raw in ("12-" * 400, "a" * 1000 + "@", "0" * 1000, "a." * 500 + "@x"):
            with self.subTest(length=len(raw)):
                mask_pii(raw)
