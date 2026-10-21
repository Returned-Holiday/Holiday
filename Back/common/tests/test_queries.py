from django.contrib.auth.models import AnonymousUser
from django.http import Http404
from django.test import TestCase

from apps.accounts.models import User
from apps.reports.models import Report
from common.queries import filter_owned, get_owned_or_404


class OwnedQueryTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user(email="owner@example.com", nickname="owner")
        self.other = User.objects.create_user(email="other@example.com", nickname="other")
        self.mine = self.make_report(self.owner)
        self.theirs = self.make_report(self.other)

    def make_report(self, reporter: User) -> Report:
        return Report.objects.create(reporter=reporter, company_name="테스트기업", source_url="https://example.com",
                                     leak_items_text="이름")

    def owned(self, user: User | AnonymousUser, **lookup: object) -> Report:
        return get_owned_or_404(Report.objects.all(), user, owner_field="reporter", **lookup)

    def test_own_object_found(self) -> None:
        self.assertEqual(self.owned(self.owner, pk=self.mine.pk), self.mine)

    def test_other_and_missing_same_404(self) -> None:
        for pk in (self.theirs.pk, self.theirs.pk + 100):
            with self.subTest(pk=pk), self.assertRaises(Http404):
                self.owned(self.owner, pk=pk)

    def test_lookup_cannot_override_owner(self) -> None:
        for lookup in ({"reporter": self.other}, {"reporter_id": self.other.pk}, {"reporter__in": [self.other]}):
            with self.subTest(lookup=list(lookup)), self.assertRaises(Http404):
                self.owned(self.owner, pk=self.theirs.pk, **lookup)

    def test_anonymous_gets_nothing(self) -> None:
        self.assertFalse(filter_owned(Report.objects.all(), AnonymousUser(), owner_field="reporter").exists())
        with self.assertRaises(Http404):
            self.owned(AnonymousUser(), pk=self.mine.pk)

    def test_filter_only_own(self) -> None:
        owned = filter_owned(Report.objects.all(), self.owner, owner_field="reporter")
        self.assertEqual(list(owned), [self.mine])
