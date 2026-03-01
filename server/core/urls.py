from django.urls import path, include

api_patterns = [
    path('accounts/', include('accounts.urls')),
    path('settings/', include('settings.urls')),
    path('meta/', include('meta.urls')),
]

urlpatterns = [
    path('api/', include(api_patterns)),
]