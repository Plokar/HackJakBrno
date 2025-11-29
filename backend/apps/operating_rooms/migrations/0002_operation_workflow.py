# Migration to add user workflow fields to Operation model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('operating_rooms', '0001_initial'),
    ]

    operations = [
        # Aktualizace STATUS_CHOICES
        migrations.AlterField(
            model_name='operation',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Návrh'),
                    ('pending_approval', 'Čeká na schválení'),
                    ('approved', 'Schváleno'),
                    ('scheduled', 'Naplánováno'),
                    ('in_progress', 'Probíhá'),
                    ('completed', 'Dokončeno'),
                    ('cancelled', 'Zrušeno'),
                ],
                default='draft',
                max_length=20
            ),
        ),
        # Přidat pole created_by
        migrations.AddField(
            model_name='operation',
            name='created_by',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_operations',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        # Přidat pole approved_by
        migrations.AddField(
            model_name='operation',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_operations',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        # Přidat pole approved_at
        migrations.AddField(
            model_name='operation',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
