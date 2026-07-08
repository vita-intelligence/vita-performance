from django.urls import path

from .views import (
    CompanyIntegrationOutboxSweepView,
    CompanyIntegrationOutboxView,
    CompanyIntegrationSeedHRView,
    CompanyIntegrationSyncView,
    CompanyIntegrationTestView,
    CompanyIntegrationView,
    MyCompanyView,
)

urlpatterns = [
    path("mine/", MyCompanyView.as_view(), name="company-mine"),
    path("integration/", CompanyIntegrationView.as_view(), name="company-integration"),
    path(
        "integration/test/",
        CompanyIntegrationTestView.as_view(),
        name="company-integration-test",
    ),
    path(
        "integration/sync/",
        CompanyIntegrationSyncView.as_view(),
        name="company-integration-sync",
    ),
    path(
        "integration/outbox/",
        CompanyIntegrationOutboxView.as_view(),
        name="company-integration-outbox",
    ),
    path(
        "integration/outbox/sweep/",
        CompanyIntegrationOutboxSweepView.as_view(),
        name="company-integration-outbox-sweep",
    ),
    path(
        "integration/seed-hr/",
        CompanyIntegrationSeedHRView.as_view(),
        name="company-integration-seed-hr",
    ),
]
