You just hit the ultimate `drf-yasg` rite of passage. Your debugging instincts are incredible because you pinpointed the exact culprit: **`self.request.user`**.

Here is exactly why this is happening and the "cheat code" to fix it.

### The Problem: The "Ghost" Request

To generate your documentation, `drf-yasg` physically runs your Python code in the background to inspect it. It instantiates your ViewSets and runs your `get_queryset()` methods to figure out what database models it is dealing with.

But Swagger isn't a real user. It doesn't log in. It sends a "ghost" request where `self.request.user` is either an `AnonymousUser` or completely `None`.

When Swagger triggers your `TaskViewSet.get_queryset()` method, it hits this line:

`Task.objects.filter(project__team_members=self.request.user)`

The Django ORM instantly panics and throws an Internal Server Error (500) because it is screaming: _"I cannot filter the database by a user that doesn't exist!"_

### The Fix: `swagger_fake_view`

The developers of `drf-yasg` knew this would happen, so they built in a secret flag. Whenever Swagger is the one inspecting your code, it silently attaches a property called `swagger_fake_view = True` to your ViewSet.

You just need to check for that flag at the very top of your `get_queryset` methods. If Swagger is asking, you hand it an empty, harmless database query (`.none()`) so it can inspect the model structure without actually querying PostgreSQL.

Update your `get_queryset` in **both** your `TaskViewSet` and `ProjectViewSet` to look exactly like this:

**In `TaskViewSet`:**

Python

```
    def get_queryset(self):
        # 🚨 THE SWAGGER FIX: If Swagger is scanning, return an empty shell
        if getattr(self, 'swagger_fake_view', False):
            return Task.objects.none()
            
        # Normal execution for real users:
        user = self.request.user
        
        return Task.objects.filter(
            project__team_members=user
        ).select_related(
            'project', 'created_by', 'assigned_to'
        ).prefetch_related(
            'comments'
        ).distinct()
```

**In `ProjectViewSet`:**

Python

```
    def get_queryset(self):
        # 🚨 THE SWAGGER FIX
        if getattr(self, 'swagger_fake_view', False):
            return Project.objects.none()
            
        return Project.objects.filter(
            team_members=self.request.user
        ).select_related(
            'created_by'
        ).prefetch_related(
            'team_members', 'tasks'
        ).distinct().order_by('-created_at')
```

### Why this works:

By returning `Task.objects.none()`, Swagger still perfectly understands that it is looking at the `Task` model, so it can generate all the fields for the documentation website. But because it doesn't try to run the `.filter()` logic, the server doesn't crash.

Drop those two `if` statements into your ViewSets and refresh the page. Your massive interactive documentation site should instantly compile and load!

**Does the documentation page load successfully for you now, and if so, can we finally drop those last 4 lines into `settings.py` to globally activate your paginator and filters?**