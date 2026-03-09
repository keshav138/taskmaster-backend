Welcome to the security layer of your application. Moving from standard Django views to Django REST Framework (DRF) requires a shift in how you handle users. You are no longer using browser cookies; you are moving to stateless API authentication.

Here is the complete background on how JSON Web Tokens (JWT) work, followed by a breakdown of exactly what your configuration code is doing.

### 1. The Core Concept of JWT

Think of JWT authentication like a **hotel keycard system**.

- **The Front Desk (Login):** You walk in, show your ID, and prove who you are (username and password).
    
- **The Keycard (The Token):** The desk clerk gives you a plastic keycard. This card doesn't contain your password; it just cryptographically proves that the front desk verified you. It also has an expiration date coded into it.
    
- **Opening Doors (Accessing the API):** Every time you want to enter your room or the gym (access an API endpoint like `/api/tasks/`), you don't show your passport again. You just swipe the keycard.
    

**Why is this so popular for APIs?**

It is **stateless**. The server does not need to look up a database table of "active sessions" every single time a request comes in. The server just looks at the token, verifies the cryptographic signature, and immediately grants or denies access. This makes your backend incredibly fast and scalable.

---

### 2. Breakdown of Your Configuration Snippet

Your code is setting up the rules for this "hotel keycard" system. Here is what each section does and whether it is mandatory.

#### A. `INSTALLED_APPS`

Python

```
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
```

- **What it does:** Tells Django to load the core tools for building APIs (`rest_framework`) and the specific library that generates the cryptographic tokens (`rest_framework_simplejwt`).
    
- **Is it mandatory?** **Yes.** If you don't add these, Django won't recognize the tools, and your API will crash on startup.
    

#### B. `REST_FRAMEWORK` Configuration

Python

```
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

- **What it does:** This changes the global default settings for your entire API.
    
    - **Authentication:** Tells the API _how_ to identify users. Instead of looking for a browser session cookie, it will exclusively look for a JWT keycard.
        
    - **Permission:** Tells the API _who_ is allowed in. `IsAuthenticated` acts as a global bouncer. It means absolutely every endpoint in your app is locked down by default unless the user has a valid token.
        
- **Is it mandatory?** **Yes**, if you want a secure API. Without this, DRF defaults to allowing basic browser session logins, which defeats the purpose of building a modern stateless API.
    

#### C. `SIMPLE_JWT` Settings

This dictionary fine-tunes the exact rules of your tokens.

|**Setting**|**Purpose**|**Mandatory?**|
|---|---|---|
|**`ACCESS_TOKEN_LIFETIME`**|How long the main "keycard" lasts before it stops working. 1 hour is a great, secure default.|No (Defaults to 5 mins if omitted).|
|**`REFRESH_TOKEN_LIFETIME`**|A special secondary token used _only_ to get a new Access Token without typing a password again. Set to 7 days here.|No (Defaults to 1 day if omitted).|
|**`ROTATE_REFRESH_TOKENS`**|Security feature: When a user uses their Refresh Token, the server destroys it and gives them a brand new one.|No (Defaults to False).|
|**`BLACKLIST_AFTER_ROTATION`**|Ensures that old, used-up refresh tokens are completely banned from the system so hackers can't reuse them.|No (Defaults to False, requires the blacklist app).|
|**`AUTH_HEADER_TYPES`**|The prefix the frontend must use when sending the token. The standard is `Authorization: Bearer <token>`.|No (Defaults to 'Bearer').|

---

### 3. The Access vs. Refresh Token Strategy

You might wonder why we need _two_ tokens (Access and Refresh) instead of just one token that lasts forever. It comes down to damage control.

- **Access Tokens** are sent with every single API request. Because they travel over the network constantly, they have a higher risk of being intercepted. Therefore, we give them a very short lifespan (e.g., 1 hour). If a hacker steals it, they only have access for a few minutes.
    
- **Refresh Tokens** are sent very rarely—only when the Access Token dies. Because they are kept locked away safely on the client side most of the time, they can have a long lifespan (e.g., 7 days).
    

### 4. Note on Blacklisting

In your `SIMPLE_JWT` settings, you have `'BLACKLIST_AFTER_ROTATION': True`. For this to actually work, you must add one more app to your `INSTALLED_APPS`:

Python

```
INSTALLED_APPS = [
    # ...
    'rest_framework_simplejwt.token_blacklist', # ADD THIS
]
```

You will also need to run `python manage.py migrate` because the blacklist feature creates a new database table to store all the "banned" tokens.

Would you like me to show you how to wire up the URL routes (`urls.py`) so your API can actually generate these tokens when a user logs in?