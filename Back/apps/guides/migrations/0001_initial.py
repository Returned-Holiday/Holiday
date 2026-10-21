import common.validators
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('incidents', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Action',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('trigger_type', models.CharField(choices=[('LEAK_TYPE', '유형'), ('SURVEY', '설문'), ('ALWAYS', '항상')], max_length=20)),
                ('leak_type', models.CharField(blank=True, choices=[('CONTACT', '연락처'), ('ACCOUNT', '계정정보'), ('RESIDENT_NUMBER', '주민등록번호'), ('FINANCIAL', '금융정보'), ('LOCATION', '위치정보'), ('AUTH_FACTOR', '인증수단 정보'), ('OTHER', '기타')], max_length=30, null=True)),
                ('survey_key', models.CharField(blank=True, choices=[('PAYMENT_LINKED', '결제수단 연결'), ('REUSED_PASSWORD', '비밀번호 재사용'), ('IMPERSONATION_CONTACT', '사칭 연락'), ('DAMAGE_OCCURRED', '피해 발생')], max_length=30, null=True)),
                ('priority', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('title', models.CharField(max_length=200)),
                ('steps', models.TextField(validators=[django.core.validators.MaxLengthValidator(5000)])),
                ('source_url', models.CharField(blank=True, max_length=500, null=True, validators=[common.validators.validate_https_url])),
                ('status', models.CharField(choices=[('PUBLIC', '공개'), ('PRIVATE', '비공개')], default='PRIVATE', max_length=20)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('incident', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.RESTRICT, related_name='special_actions', to='incidents.incident')),
            ],
            options={
                'db_table': 'actions',
            },
        ),
        migrations.CreateModel(
            name='ActionCompletion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('completed_at', models.DateTimeField(auto_now_add=True)),
                ('action', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='completions', to='guides.action')),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='action_completions', to='incidents.incident')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='action_completions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'action_completions',
            },
        ),
        migrations.CreateModel(
            name='SurveyResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payment_linked', models.CharField(choices=[('YES', '예'), ('NO', '아니요'), ('UNKNOWN', '모름')], max_length=10)),
                ('reused_password', models.CharField(choices=[('YES', '예'), ('NO', '아니요'), ('UNKNOWN', '모름')], max_length=10)),
                ('impersonation_contact', models.CharField(choices=[('YES', '예'), ('NO', '아니요'), ('UNKNOWN', '모름')], max_length=10)),
                ('damage_occurred', models.CharField(choices=[('YES', '예'), ('NO', '아니요'), ('UNKNOWN', '모름')], max_length=10)),
                ('leak_items_unknown', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('incident', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='survey_responses', to='incidents.incident')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='survey_responses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'survey_responses',
            },
        ),
        migrations.CreateModel(
            name='SurveySelectedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('leak_item', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, to='incidents.incidentleakitem')),
                ('survey_response', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='guides.surveyresponse')),
            ],
            options={
                'db_table': 'survey_selected_items',
            },
        ),
        migrations.AddField(
            model_name='surveyresponse',
            name='selected_items',
            field=models.ManyToManyField(related_name='survey_responses', through='guides.SurveySelectedItem', to='incidents.incidentleakitem'),
        ),
        migrations.AddConstraint(
            model_name='action',
            constraint=models.CheckConstraint(condition=models.Q(('status__in', ['PUBLIC', 'PRIVATE'])), name='ck_actions_status'),
        ),
        migrations.AddConstraint(
            model_name='action',
            constraint=models.CheckConstraint(condition=models.Q(('trigger_type__in', ['LEAK_TYPE', 'SURVEY', 'ALWAYS'])), name='ck_actions_trigger_type'),
        ),
        migrations.AddConstraint(
            model_name='action',
            constraint=models.CheckConstraint(condition=models.Q(('leak_type__isnull', True), ('leak_type__in', ['CONTACT', 'ACCOUNT', 'RESIDENT_NUMBER', 'FINANCIAL', 'LOCATION', 'AUTH_FACTOR', 'OTHER']), _connector='OR'), name='ck_actions_leak_type'),
        ),
        migrations.AddConstraint(
            model_name='action',
            constraint=models.CheckConstraint(condition=models.Q(('survey_key__isnull', True), ('survey_key__in', ['PAYMENT_LINKED', 'REUSED_PASSWORD', 'IMPERSONATION_CONTACT', 'DAMAGE_OCCURRED']), _connector='OR'), name='ck_actions_survey_key'),
        ),
        migrations.AddConstraint(
            model_name='action',
            constraint=models.CheckConstraint(condition=models.Q(('priority__gte', 1), ('priority__lte', 5)), name='ck_actions_priority'),
        ),
        migrations.AddConstraint(
            model_name='action',
            constraint=models.CheckConstraint(condition=models.Q(models.Q(('leak_type__isnull', False), ('survey_key__isnull', True), ('trigger_type', 'LEAK_TYPE')), models.Q(('leak_type__isnull', True), ('survey_key__isnull', False), ('trigger_type', 'SURVEY')), models.Q(('incident__isnull', False), ('leak_type__isnull', True), ('survey_key__isnull', True), ('trigger_type', 'ALWAYS')), _connector='OR'), name='ck_actions_trigger_fields'),
        ),
        migrations.AddConstraint(
            model_name='actioncompletion',
            constraint=models.UniqueConstraint(fields=('user', 'incident', 'action'), name='uq_completion'),
        ),
        migrations.AddConstraint(
            model_name='surveyselecteditem',
            constraint=models.UniqueConstraint(fields=('survey_response', 'leak_item'), name='uq_selected_item'),
        ),
        migrations.AddConstraint(
            model_name='surveyresponse',
            constraint=models.UniqueConstraint(fields=('user', 'incident'), name='uq_survey_user_incident'),
        ),
        migrations.AddConstraint(
            model_name='surveyresponse',
            constraint=models.CheckConstraint(condition=models.Q(('payment_linked__in', ['YES', 'NO', 'UNKNOWN'])), name='ck_survey_payment_linked'),
        ),
        migrations.AddConstraint(
            model_name='surveyresponse',
            constraint=models.CheckConstraint(condition=models.Q(('reused_password__in', ['YES', 'NO', 'UNKNOWN'])), name='ck_survey_reused_password'),
        ),
        migrations.AddConstraint(
            model_name='surveyresponse',
            constraint=models.CheckConstraint(condition=models.Q(('impersonation_contact__in', ['YES', 'NO', 'UNKNOWN'])), name='ck_survey_impersonation_contact'),
        ),
        migrations.AddConstraint(
            model_name='surveyresponse',
            constraint=models.CheckConstraint(condition=models.Q(('damage_occurred__in', ['YES', 'NO', 'UNKNOWN'])), name='ck_survey_damage_occurred'),
        ),
    ]
