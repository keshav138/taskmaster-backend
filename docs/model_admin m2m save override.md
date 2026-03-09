Here is a line-by-line breakdown of the code in the image. This implementation uses Django's **Signals** framework to intercept database changes and enforce your business logic.


- **`signals.py`**: Keeps your `models.py` clean.
    
- **`apps.py`**: Ensures the signals are loaded only when the app is ready.
---

### Part 1: The Signal Logic (`tasks/signals.py`)

This file contains the actual "listener" and the rules it enforces.

#### 1. The Imports

- **`from django.db.models.signals import m2m_changed`**: This imports a highly specific signal. Unlike `post_save` (which triggers when a main table row is saved), `m2m_changed` triggers strictly when a **Many-to-Many** relationship is modified (items are added, removed, or wiped).
    
- **`from django.dispatch import receiver`**: This imports the decorator used to connect your function to the signal.
    
- **`from .models import Project`**: Pulls in your `Project` model so the signal knows what to monitor.
    

#### 2. The Decorator (`@receiver`)

Python

```
@receiver(m2m_changed, sender=Project.team_members.through)
```

- **What it does:** This tells Django, "Whenever the `m2m_changed` signal is fired by this specific sender, run the function directly below me."
    
- **The `sender`:** Notice it is **not** just `Project`. It is `Project.team_members.through`. Because Many-to-Many fields use a hidden intermediate database table, the `.through` attribute tells Django to listen for changes on that specific hidden table, rather than the main `Project` table.
    

#### 3. The Function & Parameters

Python

```
def add_creator_to_team(sender, instance, action, **kwargs):
```

- **`instance`**: The actual project object being updated in memory (e.g., the "Website Redesign" project).
    
- **`action`**: This is a string provided by Django that tells you exactly _what_ is happening to the Many-to-Many list. Common actions include `"pre_add"`, `"post_add"`, `"pre_remove"`, `"post_remove"`, and `"post_clear"`.
    

#### 4. The Core Logic

Python

[[why post_add or post_clear]]
```
if action == "post_add" or action == "post_clear":
```

- **Why these actions?** The Admin panel saves Many-to-Many fields by first clearing the existing list (`"post_clear"`) and then adding the new selections (`"post_add"`). By targeting these two actions, you ensure your code runs _after_ the Admin panel has finished trying to wipe the list.
    

Python

```
    if instance.created_by not in instance.team_members.all():
        instance.team_members.add(instance.created_by)
```

- **The Safety Check:** It queries the database to see if the project creator (`instance.created_by`) is already inside the current list of team members (`instance.team_members.all()`).
    
- **The Action:** If the creator is missing (because the Admin just cleared the list), it forcefully adds them back into the hidden table.
    

---

### Part 2: Activation (`tasks/apps.py`)

Writing the signal isn't enough; Django doesn't know the `signals.py` file exists until you tell it to load it.

#### 1. The Class Definition

Python

```
class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tasks'
```

- This is standard Django boilerplate that configures the `tasks` app.
    

#### 2. The `ready` Method

Python

```
    def ready(self):
        import tasks.signals
```

- **What it does:** The `ready()` method is a built-in function that executes exactly once, right when the Django server successfully starts up.
    
- **Why put the import here?** If you placed `import tasks.signals` at the very top of `apps.py`, Django might try to load the signal before the database models are fully initialized, causing a crash. By placing it inside `ready()`, you guarantee that all models and database connections are fully established before you turn on your "listeners".
    

---

With this database modeling and signal logic implemented, your backend foundation is rock solid. Would you like me to guide you through installing `djangorestframework` and setting up the API views for **Day 3**?