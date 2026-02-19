from django.contrib import admin
from .models import Project, Task, Comment, Activity

# Register your models here.

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['project_name', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['project_name', 'description']
    filter_horizontal = ['team_members']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'assigned_to', 'status', 'priority', 'due_date']
    list_filter = ['status', 'priority', 'created_at']
    search_fields = ['title', 'description']
    date_hierarchy = 'created_at'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'action', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['action', 'details']


