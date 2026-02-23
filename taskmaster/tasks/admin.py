from django.contrib import admin
from .models import Project, Task, Comment, Activity

# Register your models here.

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['id','project_name', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['project_name', 'description']
    filter_horizontal = ['team_members']
    readonly_fields = ['id']
    list_display_links = ['project_name']

    def save_model(self, request, obj, form, change):
        '''
        Override to handle team_members when saving through admin.
        'change' is false for new objects, True for existing objects
        '''

        # if this is a new project and created by is not set, set to current user
        if not change and not obj.created_by:
            obj.created_by = request.user

        super().save_model(request, obj, form, change)
    
    def save_related(self, request, form, formsets, change):

        super().save_related(request, form, formsets, change)
        obj = form.instance

        if obj.created_by:
            obj.team_members.add(obj.created_by)
           
        



@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['id','title', 'project', 'assigned_to', 'status', 'priority', 'due_date']
    list_filter = ['status', 'priority', 'created_at']
    search_fields = ['title', 'description']
    date_hierarchy = 'created_at'
    readonly_fields = ['id']
    list_display_links = ['title']



@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['id','task', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text']
    readonly_fields = ['id']
    list_display_links = ['task']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['id','project', 'user', 'action', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['action', 'details']
    readonly_fields = ['id']
    list_display_links = ['project']


