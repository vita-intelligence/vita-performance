"""Split cleaning + maintenance triggers into start + end phases.

Mirrors the PSP-side migration (backend/priv/repo/migrations/
20260921140000_split_cleaning_maintenance_triggers.exs). Legacy
single-phase trigger values on :class:`DynamicForm` fired at the
END of a session (form walk-through after Stop) — renaming to
``_end`` matches how the code has always treated them AND opens
room for new ``_start`` templates the PSP forms publisher will
start pushing.

Data renames:
    cleaning              → cleaning_end
    maintenance           → maintenance_end
    equipment_cleaning    → equipment_cleaning_end
    equipment_maintenance → equipment_maintenance_end
"""
from django.db import migrations, models


def rename_forward(apps, schema_editor):
    DynamicForm = apps.get_model("dynamic_forms", "DynamicForm")
    renames = [
        ("cleaning", "cleaning_end"),
        ("maintenance", "maintenance_end"),
        ("equipment_cleaning", "equipment_cleaning_end"),
        ("equipment_maintenance", "equipment_maintenance_end"),
    ]
    for old, new in renames:
        DynamicForm.objects.filter(trigger=old).update(trigger=new)


def rename_backward(apps, schema_editor):
    DynamicForm = apps.get_model("dynamic_forms", "DynamicForm")
    renames = [
        ("cleaning_end", "cleaning"),
        ("maintenance_end", "maintenance"),
        ("equipment_cleaning_end", "equipment_cleaning"),
        ("equipment_maintenance_end", "equipment_maintenance"),
    ]
    for old, new in renames:
        DynamicForm.objects.filter(trigger=old).update(trigger=new)


class Migration(migrations.Migration):

    dependencies = [
        ("dynamic_forms", "0006_equipment_scoped_triggers"),
    ]

    operations = [
        # Widen the choices enum first so the data mutation below can
        # write the new values without tripping Django's model check.
        migrations.AlterField(
            model_name="dynamicform",
            name="trigger",
            field=models.CharField(
                choices=[
                    ("start", "Session Start"),
                    ("end", "Session End"),
                    ("both", "Both"),
                    ("cleaning_start", "Cleaning · start"),
                    ("cleaning_end", "Cleaning · end"),
                    ("maintenance_start", "Maintenance · start"),
                    ("maintenance_end", "Maintenance · end"),
                    ("equipment_cleaning_start", "Equipment cleaning · start"),
                    ("equipment_cleaning_end", "Equipment cleaning · end"),
                    (
                        "equipment_maintenance_start",
                        "Equipment maintenance · start",
                    ),
                    (
                        "equipment_maintenance_end",
                        "Equipment maintenance · end",
                    ),
                ],
                default="start",
                max_length=32,
            ),
        ),
        migrations.RunPython(rename_forward, rename_backward),
    ]
