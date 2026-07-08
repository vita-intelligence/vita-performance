from django.conf import settings
from django.db import models


class Company(models.Model):
    """Tenant record for vita-performance.

    Historically every tenant-scoped model was keyed on the account
    ``user`` FK. This model wraps that owner-user relationship in a
    proper tenant object so:

      * Multiple users can be added under one tenant later without
        rewriting every query.
      * A stable ``external_id`` links to the matching Company row
        in PSP for the machine-to-machine integration.
      * Integration credentials (PSP base URL + bearer token) can
        live on the tenant record rather than being global env vars.

    The migration path is non-breaking: on the initial deploy a
    Company row is created per existing User and the ``company_id``
    FK on each tenant model is backfilled. See docs/PSP_INTEGRATION_
    PROPOSAL.md §5.7 for the full 5-deploy production rollout plan;
    on dev branches we collapse it to one atomic migration.
    """

    external_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="PSP company identifier — pairs a vita-performance tenant with its PSP counterpart.",
    )
    name = models.CharField(max_length=200)
    owner_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_company',
        null=True,
        blank=True,
    )

    # PSP integration bearer credentials. Stored per-tenant so a
    # multi-tenant future doesn't need a rewrite; today only Vita's
    # own Company row uses them.
    psp_base_url = models.URLField(
        null=True,
        blank=True,
        help_text="Base URL of the PSP backend, e.g. https://vita-psp-backend.azurewebsites.net",
    )
    psp_integration_token = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=(
            "Bearer token minted at /settings/integrations on the PSP side. "
            "Presented as X-Integration-Token on every call."
        ),
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companies'
        verbose_name_plural = 'companies'
        ordering = ['name']

    def __str__(self):
        return self.name
