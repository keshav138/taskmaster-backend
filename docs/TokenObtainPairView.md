You are experiencing the exact moment every developer hits when using a powerful framework: the "black magic" barrier. It feels unsettling when a library handles something as critical as passwords without letting you see the code.

Here is the exact breakdown of how that "magic" works, where the code is hidden, and how it knows exactly which database table to query in your PostgreSQL database.

### 1. Where is the comparison code hidden?

When you wrote `path('auth/login/', TokenObtainPairView.as_view(), ...)`, you didn't write a view; you plugged in a massive, pre-written class from the `rest_framework_simplejwt` library.

If you were to open the source code of the SimpleJWT library installed on your computer, you would see that `TokenObtainPairView` has its own built-in serializer called `TokenObtainPairSerializer`.

Inside that hidden serializer, the library runs a core Django function called `authenticate(username=username, password=password)`. **SimpleJWT doesn't actually check the password itself—it delegates the job to Django's core security system.**

### 2. How does it know which table to use?

This is the most crucial part of Django's architecture. SimpleJWT does not guess which table holds your users. Instead, it relies on a global, hardcoded Django setting called **`AUTH_USER_MODEL`**.

1. **The Default:** When you install Django, `AUTH_USER_MODEL` defaults to `auth.User`. This corresponds exactly to the `from django.contrib.auth.models import User` table you imported in your models.
    
2. **The Database Reality:** Because of this default setting, Django knows to execute its SQL query against the `auth_user` table in your PostgreSQL database.
    
3. **The Override (Future Proofing):** If you ever build a completely custom user table in the future (e.g., a `CustomUser` model that logs in with an email instead of a username), you simply change the `AUTH_USER_MODEL = 'tasks.CustomUser'` variable in your `settings.py`. SimpleJWT will instantly read that new setting and switch its queries to your new table without you having to rewrite any login logic.
    

### 3. The Exact Step-by-Step Login Pipeline

When a user hits your login endpoint, here is the exact sequence of events happening under the hood:

1. **The Request:** The frontend sends a JSON payload: `{"username": "alice", "password": "MySecretPassword123"}` to `/api/auth/login/`.
    
2. **The Hand-off:** `TokenObtainPairView` catches the JSON and passes it to Django's core `authenticate()` function.
    
3. **The Database Query:** Django looks up the user "alice" in the `auth_user` table.
    
4. **The Cryptographic Check:** If "alice" exists, Django grabs her hashed password from the database. It then runs "MySecretPassword123" through the exact same PBKDF2 hashing algorithm it used during registration.
    
5. **The Verdict:** If the new hash perfectly matches the database hash, Django returns the `User` object to SimpleJWT. (If it fails, it throws a `401 Unauthorized` error).
    
6. **Token Generation:** SimpleJWT sees that Django approved the user. It generates the Access and Refresh tokens (the "keycard" and "passport"), stamps them with the user's ID, and sends them back to the frontend.
    

By outsourcing this to SimpleJWT and Django's core, you ensure your app uses battle-tested, cryptographically secure login logic instead of trying to write a custom password-checking script from scratch.

Now that the mystery of the login routing is solved, the entire authentication foundation for your Task Management app is complete!

**Would you like me to guide you on how to test this login endpoint using an API client like Postman, or would you prefer to move straight to writing the serializers for your `Project` and `Task` models?**