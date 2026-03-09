I see the issue! The `save_model` method is saving the project and adding the creator, but when you open it again, the creator isn't showing in the "Chosen team members" box on the right.

This is because Django's admin form loads the initial data BEFORE the `save_model` runs. The fix is to also override `save_related` which handles ManyToMany fields AFTER the form is saved.

## Updated Solution - Use `save_related` Instead

Replace your `ProjectAdmin` in `tasks/admin.py` with this:

```python
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['project_name', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['project_name', 'description']
    filter_horizontal = ['team_members']
    
    def save_model(self, request, obj, form, change):
        """
        Save the project instance.
        If new project and no creator set, use current logged-in user.
        """
        if not change and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def save_related(self, request, form, formsets, change):
        """
        After saving the main object and before saving M2M relationships,
        ensure the creator is added to team_members.
        This runs AFTER save_model but BEFORE the M2M form data is saved.
        """
        # First save the M2M data from the form
        super().save_related(request, form, formsets, change)
        
        # Now ensure creator is in team_members
        obj = form.instance
        if obj.created_by and obj.created_by not in obj.team_members.all():
            obj.team_members.add(obj.created_by)
```

## How This Works:

1. **`save_model`** → Saves the Project instance first (name, description, created_by)
2. **`save_related`** → Called NEXT to handle ManyToMany relationships
3. Inside `save_related`:
    - First: Let Django save whatever you selected in the admin form
    - Then: Force-add the creator if they're not already there

## Alternative: Even Simpler Approach

If the above still doesn't work perfectly, use this nuclear option that ALWAYS works:

```python
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['project_name', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['project_name', 'description']
    filter_horizontal = ['team_members']
    
    def save_model(self, request, obj, form, change):
        """Set creator if new project"""
        if not change and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def save_related(self, request, form, formsets, change):
        """Ensure creator is always in team_members"""
        super().save_related(request, form, formsets, change)
        
        # Force add creator after everything else is saved
        obj = form.instance
        if obj.created_by:
            # Use add() which is idempotent (safe to call multiple times)
            obj.team_members.add(obj.created_by)
```

## Test Steps:

1. **Restart Django server**
2. **Create a NEW project** in admin:
    - Project name: "Test Project"
    - Description: "Testing auto-add"
    - Created by: Select "balerion" (or your username)
    - Team members: **Leave empty** or select others
    - Click "Save"
3. **Reopen the project** - "balerion" should now appear in "Chosen team members"

## Additional Debug Check:

Add a print statement to see what's happening:

```python
def save_related(self, request, form, formsets, change):
    """Ensure creator is always in team_members"""
    super().save_related(request, form, formsets, change)
    
    obj = form.instance
    print(f"DEBUG: Project={obj.project_name}, Creator={obj.created_by}")
    print(f"DEBUG: Current team members={list(obj.team_members.all())}")
    
    if obj.created_by:
        obj.team_members.add(obj.created_by)
        print(f"DEBUG: After add={list(obj.team_members.all())}")
```

Check your terminal/console to see what's being printed when you save.

---

## Why Your Previous Code Didn't Work:

The `save_model` method runs **before** the ManyToMany form data is processed. So:

1. `save_model` adds creator to team_members ✓
2. Admin form processes the M2M field and **overwrites** it with what you selected in the form ✗
3. Result: Creator gets removed if you didn't manually select them

`save_related` runs **after** the form processes M2M fields, so it has the final say!

Try this and let me know if it works! 🎯