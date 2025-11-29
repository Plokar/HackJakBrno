# Generated migration for ToolUsage model and PerioperativeProtocol updates

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('operating_rooms', '0006_fix_birth_number_null'),
    ]

    operations = [
        migrations.CreateModel(
            name='ToolUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('quantity_used', models.IntegerField(default=1)),
                ('cost', models.DecimalField(decimal_places=2, max_digits=10)),
                ('protocol', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='operating_rooms.perioperativeprotocol')),
                ('tool', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='operating_rooms.operationtool')),
            ],
            options={
                'db_table': 'tool_usage',
            },
        ),
        migrations.AddField(
            model_name='perioperativeprotocol',
            name='total_tools_cost',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='perioperativeprotocol',
            name='anesthesia_type',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='perioperativeprotocol',
            name='procedure_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='perioperativeprotocol',
            name='tools_used',
            field=models.ManyToManyField(through='operating_rooms.ToolUsage', to='operating_rooms.operationtool'),
        ),
    ]
