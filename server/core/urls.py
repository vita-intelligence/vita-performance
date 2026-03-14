from django.urls import path, include
from django.contrib import admin

api_patterns = [
    path('accounts/', include('accounts.urls')),
    path('settings/', include('settings.urls')),
    path('meta/', include('meta.urls')),
    path('workstations/', include('workstations.urls')),
    path('workers/', include('workers.urls')),
    path('sessions/', include('work_sessions.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('items/', include('items.urls')),
    path('kiosk/', include('kiosk.urls')),
    path('qc/', include('qc.urls')),
    path('subscription/', include('subscription.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_patterns)),
]