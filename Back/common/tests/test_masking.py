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
                ("900101.1234567", "900101.1******"),
                ("900101 1234567", "900101 1******"),
            )
        )

    def test_card_number(self) -> None:
        self.assert_masked(
            (
                ("1234-5678-9012-3456", "1234-56**-****-3456"),
                ("1234 5678 9012 3456", "1234 56** **** 3456"),
                ("1234567890123456", "123456******3456"),
                ("1234.5678.9012.3456", "1234.56**.****.3456"),
                ("1234-5678 9012-3456", "1234-56** ****-3456"),
                ("1234 - 5678 - 9012 - 3456", "1234 - 56** - **** - 3456"),
            )
        )

    def test_amex_card_number(self) -> None:
        self.assert_masked(
            (
                ("3782-822463-10005", "3782-82****-**005"),
                ("378282246310005", "378282******005"),
            )
        )

    def test_phone_number(self) -> None:
        self.assert_masked(
            (
                ("010-1234-5678", "010-1234-****"),
                ("01012345678", "0101234****"),
                ("02-123-4567", "02-123-****"),
                ("031-1234-5678", "031-1234-****"),
                ("010.1234.5678", "010.1234.****"),
                ("010-1234 5678", "010-1234 ****"),
                ("010 1234-5678", "010 1234-****"),
                ("011-123-4567", "011-123-****"),
                ("010 - 1234 - 5678", "010 - 1234 - ****"),
                ("(02)1234-5678", "(02)1234-****"),
                ("(010)1234-5678", "(010)1234-****"),
            )
        )

    def test_masking_is_idempotent(self) -> None:
        raw = (
            "010-1234-5678 hong@test.com 1234-5678-9012-3456 900101-1234567 123-456-789012 "
            "테헤란로 123-45, 101동 1203호 아이디: hong1234 성명: 홍길동 M12345678 11-12-123456-78"
        )
        once = mask_pii(raw)
        self.assertEqual(mask_pii(once), once)

    def test_address(self) -> None:
        self.assert_masked(
            (
                ("서울 강남구 테헤란로 123-45", "서울 강남구 테헤란로 ***-**"),
                ("중앙로12번길 34", "중앙로**번길 **"),
                ("테헤란로 123(역삼동)", "테헤란로 ***(역삼동)"),
                ("역삼동 737", "역삼동 ***"),
                ("역삼동 737-1번지", "역삼동 ***-*번지"),
                ("테헤란로 123, 101동 1203호", "테헤란로 ***, ***동 ****호"),
            )
        )

    def test_account_id(self) -> None:
        self.assert_masked(
            (
                ("아이디: hong1234", "아이디: ho******"),
                ("ID hong_99", "ID ho*****"),
                ("계정=abc", "계정=ab*"),
            )
        )

    def test_name_with_label(self) -> None:
        self.assert_masked(
            (
                ("성명: 홍길동", "성명: 홍*동"),
                ("이름 : 홍길", "이름 : 홍*"),
                ("고객명:남궁길동", "고객명:남**동"),
            )
        )

    def test_passport_number(self) -> None:
        self.assert_masked(
            (
                ("M12345678", "M1234****"),
                ("여권 M123A4567", "여권 M123A****"),
            )
        )

    def test_driver_license(self) -> None:
        self.assert_masked(
            (
                ("11-12-123456-78", "11-12-******-**"),
                ("서울 12-123456-78", "서울 12-******-**"),
                ("서울12-123456-78", "서울12-******-**"),
            )
        )

    # 항목명·단위·법 조항·로그 필드는 그대로 (OCR 매칭·보안 로그 보존)
    def test_keeps_similar_non_pii(self) -> None:
        for raw in (
            "이름 주소 아이디 유출",
            "처리 2건, 경로 2개",
            "지하철 2호선",
            "제29조 제1호",
            "ID와 비밀번호",
            "login user_id=12345 ip=1.2.3.4",
            "SKT 2025",
        ):
            with self.subTest(raw=raw):
                self.assertEqual(mask_pii(raw), raw)

    def test_international_phone_number(self) -> None:
        self.assert_masked(
            (
                ("+82 10-1234-5678", "+82 10-1234-****"),
                ("+82-10-1234-5678", "+82-10-1234-****"),
                ("+821012345678", "+82101234****"),
                ("+82 010-1234-5678", "+82 010-1234-****"),
                ("+82 2-123-4567", "+82 2-123-****"),
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

    def test_ambiguous_numbers_masked_as_account(self) -> None:
        self.assert_masked(
            (
                ("사업자 123-45-67890", "사업자 123-45-*****"),
                ("주문번호 202510151234", "주문번호 2025101*****"),
            )
        )

    def test_dotted_numbers_not_account(self) -> None:
        for raw in (
            "192.168.100.200",
            "2025.10.15 10:30",
            "버전 1.181.0",
            "대표번호 1588-1234",
            "10 20 30 40 50",
            "2025년 10월 15일",
        ):
            with self.subTest(raw=raw):
                self.assertEqual(mask_pii(raw), raw)

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
        for raw in ("12-" * 400, "a" * 1000 + "@", "0" * 1000, "a." * 500 + "@x", "가로1" * 400, "아이디:" * 300, "1동" * 500):
            with self.subTest(length=len(raw)):
                mask_pii(raw)
