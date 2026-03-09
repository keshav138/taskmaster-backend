Yes, these commands are almost entirely correct and are a great way to verify your **Phase 1** foundation. Because you defined `related_name` so carefully in your `models.py`, your queries read like plain English.

However, there is **one specific error** in your list regarding the `assigned_tasks` query.

### 1. The Correction: `assigned_to`

In your `Task` model, you defined the `assigned_to` field like this:

Python

```
assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, ...)
```

**The Problem:** You did **not** provide a `related_name` for this field.

**The Result:** Django defaults to using `task_set`.

- **Your code:** `alice.assigned_tasks.all()` will throw an `AttributeError`.
    
- **The fix:** Use `alice.task_set.all()`.
    

> **Pro Tip:** To make your query work exactly as you wrote it, go back to `models.py` and add `related_name='assigned_tasks'` to the `assigned_to` field in the `Task` model, then run migrations again.

---

### 2. Breakdown of why the others work

Here is how your other queries map to the `related_name` attributes you defined:

|**Your Query**|**Model/Field used**|**Defined related_name**|
|---|---|---|
|`alice.projects.all()`|`Project.team_members`|`'projects'`|
|`alice.created_tasks.all()`|`Task.created_by`|`'created_tasks'`|
|`project.tasks.all()`|`Task.project`|`'tasks'`|
|`task.comments.all()`|`Comment.task`|`'comments'`|

---

### 3. A Note on `task.is_overdue`

This will work perfectly because you used the `@property` decorator.

- Since it is a property, you access it without parentheses: `task.is_overdue`.
    
- If the task has no `due_date`, it will safely return `False` as per your logic.
    

---

### 4. How to run these tests

To run these commands, you must use the **Django Shell**. If you try to run them in a standard Python window, they will fail because Django hasn't "started" its database connection.

**Run this in your terminal:**

Bash

```
python manage.py shell
```

Then paste your queries one by one.

**Would you like me to show you a few "Write" queries?** For example, how to programmatically create a Task and assign it to a Project using the shell?