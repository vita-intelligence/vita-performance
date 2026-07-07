"""One-shot data migration: create a Company per existing User and
backfill the ``company`` FK on every tenant-scoped model that
already carries a ``user`` FK (Item, Worker, Workstation,
WorkSession). Reversible — the reverse just clears the backfilled
FKs and deletes the auto-created Company rows.

See docs/PSP_INTEGRATION_PROPOSAL.md §5.7 for the 5-deploy
production rollout plan; on dev branches we collapse it to this
single migration because the tenant count is small and downtime is
irrelevant.
"""
from django.db import migrations


def _company_name_for(user):
    """Prefer a human-readable name over the raw username / email."""
    first = getattr(user, 'first_name', '') or ''
    last = getattr(user, 'last_name', '') or ''
    full = f'{first} {last}'.strip()
    if full:
        return full
    return getattr(user, 'username', None) or getattr(user, 'email', None) or f'Tenant {user.id}'


def forward(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Company = apps.get_model('companies', 'Company')

    tenant_models = [
        ('items', 'Item'),
        ('workers', 'Worker'),
        ('workstations', 'Workstation'),
        ('work_sessions', 'WorkSession'),
    ]

    user_to_company = {}
    for user in User.objects.all():
        company, _ = Company.objects.get_or_create(
            owner_user_id=user.id,
            defaults={'name': _company_name_for(user)},
        )
        user_to_company[user.id] = company.id

    for app_label, model_name in tenant_models:
        Model = apps.get_model(app_label, model_name)
        # Backfill in batches; each row's company is deterministic
        # from its ``user_id``, so we just set + save.
        for row in Model.objects.filter(company__isnull=True).iterator(chunk_size=500):
            company_id = user_to_company.get(row.user_id)
            if company_id is None:
                # Shouldn't happen — every user got a Company above.
                # Skip silently; the row stays orphaned rather than
                # blowing up the migration mid-run.
                continue
            row.company_id = company_id
            row.save(update_fields=['company'])


def reverse(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')

    tenant_models = [
        ('items', 'Item'),
        ('workers', 'Worker'),
        ('workstations', 'Workstation'),
        ('work_sessions', 'WorkSession'),
    ]

    for app_label, model_name in tenant_models:
        Model = apps.get_model(app_label, model_name)
        Model.objects.filter(company__isnull=False).update(company=None)

    # Only delete the auto-created (owner_user-linked) rows; leave
    # any hand-created Company alone.
    Company.objects.filter(owner_user__isnull=False).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
        ('items', '0002_item_company_external_id'),
        ('workers', '0005_worker_company_external_id'),
        ('workstations', '0008_workstation_company_external_id_psp_flag'),
        ('work_sessions', '0007_worksession_company_activity_mo'),
    ]

    operations = [
        migrations.RunPython(forward, reverse_code=reverse),
    ]
