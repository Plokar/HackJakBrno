from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operating_rooms', '0005_doctor_fhir_id_doctor_fhir_last_synced_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='birth_number',
            field=models.CharField(max_length=20, unique=True, blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='patient',
            name='diagnosis',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='doctor',
            name='specialization',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AlterField(
            model_name='doctor',
            name='license_number',
            field=models.CharField(max_length=50, unique=True, blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='doctor',
            name='hourly_rate',
            field=models.DecimalField(max_digits=10, decimal_places=2, default=0),
        ),
    ]
