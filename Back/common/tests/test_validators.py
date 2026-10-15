from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from common.validators import URL_MAX_LENGTH, validate_https_url


class ValidateHttpsUrlTests(SimpleTestCase):
    def test_accepts_https_domain(self) -> None:
        for url in (
            "https://www.example.co.kr/notice/123",
            "https://news.example.com/a?b=1#c",
            "https://example.com:8443/path",
        ):
            with self.subTest(url=url):
                validate_https_url(url)

    def test_rejects_non_https_scheme(self) -> None:
        for url in (
            "http://example.com",
            "javascript:alert(1)",
            "file:///etc/passwd",
            "ftp://example.com",
            "//example.com",
            "example.com",
        ):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                validate_https_url(url)

    def test_rejects_ip_and_localhost(self) -> None:
        for url in (
            "https://127.0.0.1/admin",
            "https://10.0.0.1",
            "https://169.254.169.254/latest/meta-data",
            "https://[::1]/",
            "https://localhost/",
        ):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                validate_https_url(url)

    def test_rejects_credentials_in_url(self) -> None:
        for url in ("https://user:pass@example.com", "https://user@example.com"):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                validate_https_url(url)

    def test_rejects_whitespace_and_control_chars(self) -> None:
        for url in ("https://exa mple.com", "https://example.com/\n", "https://example.com/\t"):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                validate_https_url(url)

    def test_length_limit(self) -> None:
        prefix = "https://example.com/"
        validate_https_url(prefix + "a" * (URL_MAX_LENGTH - len(prefix)))
        with self.assertRaises(ValidationError):
            validate_https_url(prefix + "a" * (URL_MAX_LENGTH - len(prefix) + 1))

    def test_error_message_is_generic(self) -> None:
        with self.assertRaises(ValidationError) as context:
            validate_https_url("http://example.com")
        self.assertEqual(context.exception.code, "invalid_url")
