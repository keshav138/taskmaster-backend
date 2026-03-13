When you move a Django app behind **HTTPS**, some things change about how Django interprets requests and how browsers should send cookies. These settings are mostly about **security and correct protocol detection**.

Let’s go through each one conceptually.

---

# 1. `SECURE_PROXY_SSL_HEADER`

```python
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

### The problem this solves

When Django runs behind a **reverse proxy** (like NGINX, Cloudflare, or a load balancer), the actual connection to Django is usually **HTTP**, even though the user connected via **HTTPS**.

Typical flow:

```
Browser
   │
   │ HTTPS
   ▼
NGINX / Load Balancer
   │
   │ HTTP
   ▼
Django
```

So from Django’s perspective:

```
request.is_secure() → False
```

Even though the user is actually on HTTPS.

---

### What the proxy does

The proxy adds a header like this:

```
X-Forwarded-Proto: https
```

This tells Django:

> "The original request from the user was HTTPS."

---

### What this setting does

```python
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

This tells Django:

```
If request header HTTP_X_FORWARDED_PROTO == "https"
→ treat request as secure
```

So now:

```python
request.is_secure() → True
```

This is important because Django uses this for:

- CSRF validation
    
- secure redirects
    
- building absolute URLs
    
- cookie security
    

---

# 2. `SESSION_COOKIE_SECURE`

```python
SESSION_COOKIE_SECURE = True
```

### What this does

It tells browsers:

```
Only send the session cookie over HTTPS
```

Example cookie:

```
Set-Cookie: sessionid=abc123; Secure
```

Now the browser will **never send this cookie over HTTP**.

---

### Why this matters

Without it:

```
HTTPS site
↓
User accidentally visits http://example.com
↓
Browser sends session cookie
↓
Attacker can intercept session
```

This is called **session hijacking**.

With `Secure`:

```
HTTP request → cookie not sent
```

So the session stays protected.

---

# 3. `CSRF_COOKIE_SECURE`

```python
CSRF_COOKIE_SECURE = True
```

Same idea as session cookies, but for **CSRF tokens**.

It ensures:

```
CSRF cookie only sent over HTTPS
```

Without this:

```
HTTP request could leak CSRF token
```

Which weakens CSRF protection.

So production HTTPS apps should always have:

```
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

---

# 4. Why You Turn Them Off Locally

Local development usually runs like this:

```
http://localhost:8000
```

No HTTPS.

If these are set to True locally:

```
browser refuses to send cookies
```

So login sessions break.

That’s why you sometimes see:

```python
if DEBUG:
    SESSION_COOKIE_SECURE = False
```

---

# 5. `CORS_ALLOWED_ORIGINS`

```python
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', "").split(',')
```

This is about **Cross-Origin Resource Sharing (CORS)**.

---

### The browser security rule

Browsers block requests like this:

```
frontend.com → API at api.com
```

unless the server explicitly allows it.

Example blocked request:

```
https://frontend.com
    ↓
fetch("https://api.com/data")
```

The browser checks if `api.com` allows that origin.

---

### Django configuration

You whitelist allowed domains.

Example:

```python
CORS_ALLOWED_ORIGINS = [
    "https://frontend.com",
    "https://app.example.com"
]
```

Now those domains can call your API.

---

### Why use environment variables

Instead of hardcoding:

```python
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', "").split(',')
```

You can configure it per environment.

Example environment variable:

```
CORS_ALLOWED_ORIGINS=https://frontend.com,https://app.example.com
```

Then Django converts it into:

```
["https://frontend.com", "https://app.example.com"]
```

---

# 6. Why HTTPS Matters for CORS

Origins include **protocol + domain + port**.

These are different origins:

```
http://example.com
https://example.com
```

So when you move to HTTPS, you must update CORS:

```
https://frontend.com
```

not

```
http://frontend.com
```

---

# 7. Summary

|Setting|Purpose|
|---|---|
|`SECURE_PROXY_SSL_HEADER`|tells Django the original request was HTTPS|
|`SESSION_COOKIE_SECURE`|session cookies only sent over HTTPS|
|`CSRF_COOKIE_SECURE`|CSRF cookies only sent over HTTPS|
|`CORS_ALLOWED_ORIGINS`|controls which domains can call your API|

---

### The big picture

When you enable HTTPS, you need Django to:

1️⃣ **recognize HTTPS requests correctly**  
2️⃣ **restrict cookies to encrypted connections**  
3️⃣ **allow only specific cross-origin clients**

These settings enforce that.

---

If you'd like, I can also explain **three additional Django security settings that almost every production HTTPS deployment enables** (`SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `CSRF_TRUSTED_ORIGINS`). They tie directly into how HTTPS works in production.