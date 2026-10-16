import io
import logging

from django.test import SimpleTestCase

from common.log_filters import PiiMaskingFilter


class PiiMaskingFilterTests(SimpleTestCase):
    def setUp(self) -> None:
        self.stream = io.StringIO()
        handler = logging.StreamHandler(self.stream)
        handler.setFormatter(logging.Formatter("%(message)s"))
        handler.addFilter(PiiMaskingFilter())
        self.logger = logging.getLogger("test.pii")
        self.logger.propagate = False
        self.logger.addHandler(handler)
        self.addCleanup(self.logger.removeHandler, handler)

    def test_masks_args(self) -> None:
        self.logger.warning("signup %s %s", "member@example.com", "010-1234-5678")
        output = self.stream.getvalue()
        self.assertNotIn("member@", output)
        self.assertIn("010-1234-****", output)

    def test_masks_exception_text(self) -> None:
        try:
            raise ValueError("bad 900101-1234567")
        except ValueError:
            self.logger.exception("failed")
        output = self.stream.getvalue()
        self.assertIn("ValueError", output)
        self.assertNotIn("1234567", output)

    def test_wrong_args_do_not_raise(self) -> None:
        self.logger.warning("a %s %s", "member@example.com")
        self.assertIn("a %s %s", self.stream.getvalue())
