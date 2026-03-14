from django.urls import path
from .views import SubscriptionStatusView

urlpatterns = [
    path('', SubscriptionStatusView.as_view()),
]