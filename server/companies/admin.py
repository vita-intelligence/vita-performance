from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'external_id', 'owner_user', 'is_active', 'created_at')
    search_fields = ('name', 'external_id', 'owner_user__email')
    readonly_fields = ('created_at', 'updated_at')
