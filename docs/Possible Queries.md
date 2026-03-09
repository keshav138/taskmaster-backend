Based on your database schema and the `related_name` attributes you defined in `models.py`, here are the primary types of queries you can run.

To execute these, ensure you are in the Django shell: `python manage.py shell`.

### 1. Simple Retrieval (Read)

These queries fetch data directly from a single table.

- **Get all records:** `Project.objects.all()` or `Task.objects.all()`.
    
- **Get by ID:** `Project.objects.get(id=1)`.
    
- **Filter by field:** `Task.objects.filter(status='TODO')` or `Task.objects.filter(priority='HIGH')`.
    
- **Search by text:** `Project.objects.filter(project_name__icontains='website')`.
    

---

### 2. Forward Relationship Queries

Fetching data from a "Child" to a "Parent" (following the `ForeignKey`).

- **Task to Project:** `task.project.project_name`.
    
- **Task to Creator:** `task.created_by.username`.
    
- **Comment to User:** `comment.user.email`.
    
- **Activity to Project:** `activity.project.created_at`.
    

---

### 3. Reverse Relationship Queries

Fetching data from a "Parent" to "Children" using the `related_name` values you defined.

- **Project to Tasks:** `project.tasks.all()`.
    
- **Project to Activities:** `project.activities.all()`.
    
- **Task to Comments:** `task.comments.all()`.
    
- **User to Projects (Owned):** `user.owned_projects.all()`.
    
- **User to Projects (Member):** `user.projects.all()`.
    
- **User to Tasks Created:** `user.created_tasks.all()`.
    

---

### 4. Many-to-Many Specific Queries

Interacting with the `team_members` "guest list".

- **See all members:** `project.team_members.all()`.
    
- **Check if user is a member:** `project.team_members.filter(username='alice').exists()`.
    
- **Count members:** `project.team_members.count()`.
    

---

### 5. Lookups across tables (Chained Queries)

Django allows you to "double-underscore" through relationships to find specific data.

- **Find all tasks in projects created by 'alice':** `Task.objects.filter(project__created_by__username='alice')`.
    
- **Find all comments made on a specific project:** `Comment.objects.filter(task__project=project_instance)`.
    
- **Find tasks due today for a specific team member:** `Task.objects.filter(assigned_to=user_instance, due_date=timezone.now().date())`.
    

---

### 6. Aggregation and Logic Queries

- **Count tasks by status:** `from django.db.models import Count`
    
    `project.tasks.values('status').annotate(total=Count('id'))`.
    
- **Check overdue status (using your custom property):**
    
    `overdue_tasks = [t for t in Task.objects.all() if t.is_overdue]`.
    

### Summary of Key "Keywords" from your `models.py`

To remember which words to use, look at your `related_name` declarations:

- **`tasks`**: Used on a `Project` object.
    
- **`owned_projects`**: Used on a `User` object.
    
- **`projects`**: Used on a `User` object (for membership).
    
- **`comments`**: Used on a `Task` or `User` object.
    
- **`activities`**: Used on a `Project` or `User` object.
    

**Would you like me to show you how to write an "Update" query to change a task's status from 'TODO' to 'DONE' using the shell?**