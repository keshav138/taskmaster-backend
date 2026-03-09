### 1. Customizing Primary Keys Per Model

If you don't explicitly write an `id` field in your `models.py`, Django creates one automatically using the setting in `apps.py`. However, if you _do_ write a field and add the argument `primary_key=True`, Django backs off and uses your custom field instead.

This means every single model can have a completely different type of primary key if you want.

**Example A: The UUID (Highly Recommended for APIs)**

In many modern web apps, using sequential numbers (1, 2, 3) for IDs is a security risk because it allows users to guess URLs (e.g., `api/projects/4/`). Instead, you can override the default integer ID with a UUID (a 36-character random string).

Python

```
import uuid
from django.db import models

class Project(models.Model):
    # This completely replaces the default auto-incrementing integer
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_name = models.CharField(max_length=200)
```

**Example B: A Natural Key (String)**

If you were building a lookup table where the ID is naturally a text code (like a currency or country code), you can use a `CharField`.

Python

```
class Currency(models.Model):
    # The ID will be strings like 'USD', 'EUR', 'INR'
    code = models.CharField(max_length=3, primary_key=True) 
    name = models.CharField(max_length=50)
```

---

### 2. What if you delete `default_auto_field`?

If you completely remove the line `default_auto_field = 'django.db.models.BigAutoField'` from your `apps.py`, Django doesn't crash, but it triggers a strict fallback hierarchy:

1. **The Global Fallback (`settings.py`):** Django immediately looks at your main `settings.py` file to see if there is a global variable named `DEFAULT_AUTO_FIELD`. If it finds it there, it applies it globally to all apps.
    
2. **The Legacy Default:** If the setting is missing from _both_ `apps.py` and `settings.py`, Django falls back to using the old, legacy 32-bit `AutoField`.
    
3. **The Warning:** Because `BigAutoField` is the modern standard, Django will punish you for leaving it blank. Every time you run `python manage.py runserver` or try to make migrations, your terminal will print an annoying yellow warning (`models.W042`) telling you to explicitly declare your auto field.
    

In short: By keeping it in `apps.py`, you keep your terminal clean of warnings and ensure your database is using the modern 64-bit standard.

Would you like to start configuring the `REST_FRAMEWORK` settings so we can begin building the actual API endpoints for these models?