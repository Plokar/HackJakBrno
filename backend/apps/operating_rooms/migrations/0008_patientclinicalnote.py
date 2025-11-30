from django.db import migrations, models
import django.db.models.deletion
from django.contrib.postgres.fields import ArrayField


class Migration(migrations.Migration):

    dependencies = [
        ('operating_rooms', '0007_tool_usage_support'),
    ]

    operations = [
        migrations.CreateModel(
            name='PatientClinicalNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('fhir_document_id', models.CharField(max_length=255)),
                ('source_resource_type', models.CharField(default='DocumentReference', max_length=64)),
                ('doc_status', models.CharField(blank=True, max_length=64)),
                ('category', models.CharField(blank=True, max_length=128)),
                ('author', models.CharField(blank=True, max_length=255)),
                ('indexed_at', models.DateTimeField(blank=True, null=True)),
                ('note_text', models.TextField()),
                ('note_hash', models.CharField(db_index=True, max_length=64)),
                ('embedding', ArrayField(base_field=models.FloatField(), blank=True, null=True, size=None)),
                ('embedding_model', models.CharField(blank=True, max_length=128)),
                ('embedding_last_updated', models.DateTimeField(blank=True, null=True)),
                ('source_reference', models.CharField(blank=True, max_length=512)),
                ('source_payload', models.JSONField(blank=True, null=True)),
                ('sync_status', models.CharField(choices=[('pending', 'Čeká na zpracování'), ('ready', 'Připraveno'), ('failed', 'Chyba')], default='pending', max_length=16)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='clinical_notes', to='operating_rooms.patient')),
            ],
            options={
                'db_table': 'patient_clinical_notes',
            },
        ),
        migrations.AddConstraint(
            model_name='patientclinicalnote',
            constraint=models.UniqueConstraint(fields=('patient', 'fhir_document_id'), name='unique_patient_document'),
        ),
        migrations.AddIndex(
            model_name='patientclinicalnote',
            index=models.Index(fields=('patient', 'sync_status'), name='patient_note_sync_idx'),
        ),
        migrations.AddIndex(
            model_name='patientclinicalnote',
            index=models.Index(fields=('patient', 'indexed_at'), name='patient_note_indexed_idx'),
        ),
    ]
