from django.urls import path
from .views import CurrenciesView, LanguagesView, TimezonesView

urlpatterns = [
    path('currencies/', CurrenciesView.as_view(), name='meta-currencies'),
    path('languages/', LanguagesView.as_view(), name='meta-languages'),
    path('timezones/', TimezonesView.as_view(), name='meta-timezones'),
]