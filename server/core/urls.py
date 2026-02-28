from django.urls import path, include

api_patterns = [
    path('accounts/', include('accounts.urls')),
    path('settings/', include('settings.urls')),
]

urlpatterns = [
    path('api/', include(api_patterns)),
]