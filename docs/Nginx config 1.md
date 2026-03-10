```nginx
server {
    listen 80;
    
    # 1. Serve the Frontend HTML/JS
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # This prevents 404s if people refresh on a specific page
        try_files $uri $uri/ /index.html; 
    }

    # 2. Secretly proxy API requests to Django
    location /api/ {
        # "backend" matches the service name in your docker-compose.yml
        proxy_pass http://backend:8000;
        
        # Pass along the original IP so Django knows who is calling
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

This is an **NGINX server configuration block**. It tells NGINX **how to handle incoming HTTP requests** and where to send them. Since you're deploying a **frontend + Django backend**, this file is acting as a **reverse proxy + static file server**.

I'll break it down **line-by-line and symbol-by-symbol** so you understand exactly what each piece means.

---

# 1. `server { ... }`

```
server {
```

### What it is

A **server block**.

Think of it as:

> "Define a virtual web server with its own rules."

NGINX can host multiple websites, and **each one gets its own `server` block**.

### `{ }`

Curly braces mean:

```
Everything inside belongs to this server configuration.
```

---

# 2. `listen 80;`

```
listen 80;
```

### `listen`

Directive telling NGINX:

> "Listen for incoming network connections."

### `80`

Port **80 = standard HTTP port**

When someone visits:

```
http://example.com
```

the browser connects to **port 80**.

### `;`

Every nginx directive **must end with a semicolon**.

So this line literally means:

> Listen for HTTP traffic on port 80.

---

# 3. Comment lines

```
# 1. Serve the Frontend HTML/JS
```

### `#`

Everything after `#` is ignored.

Used for **comments/documentation**.

---

# 4. `location / { ... }`

```
location / {
```

### `location`

This directive tells NGINX:

> "Apply these rules when the request URL matches something."

### `/`

This means:

```
Match the root path
```

Examples matched:

```
/
 /index.html
 /about
 /dashboard
 /products/123
```

Basically:

> Catch **all frontend requests**

### `{ }`

Everything inside defines **how those requests are handled**.

---

# 5. `root /usr/share/nginx/html;`

```
root /usr/share/nginx/html;
```

### `root`

Tells NGINX:

> "Look for files in this directory."

### `/usr/share/nginx/html`

This is the **filesystem path inside the container**.

Example:

Request:

```
GET /
```

NGINX looks for:

```
/usr/share/nginx/html/index.html
```

If the request is:

```
/style.css
```

NGINX looks for:

```
/usr/share/nginx/html/style.css
```

This works because in your Dockerfile you likely did something like:

```
COPY . /usr/share/nginx/html
```

So the **frontend build files live there**.

---

# 6. `index index.html index.htm;`

```
index index.html index.htm;
```

### `index`

Defines **default files**.

If someone requests a directory:

```
http://site.com/
```

NGINX searches for:

1️⃣ `index.html`  
2️⃣ `index.htm`

in that order.

---

# 7. `try_files`

```
try_files $uri $uri/ /index.html;
```

This is the **most important line for SPAs (React/Vue/etc)**.

Let's break it symbol by symbol.

---

## `try_files`

Directive that means:

> Try these files **in order** until one exists.

---

## `$uri`

```
$uri
```

This is an **NGINX variable**.

Meaning:

```
The request path
```

Example request:

```
/dashboard
```

Then:

```
$uri = /dashboard
```

---

## `$uri/`

```
$uri/
```

Meaning:

```
Maybe the request is a directory
```

Example:

```
/blog
```

Try:

```
/blog/
```

---

## `/index.html`

Fallback file.

If the other two fail, serve:

```
/index.html
```

---

### Why this is needed

Single Page Apps use **client-side routing**.

Example:

User visits:

```
mysite.com/profile
```

But the server **doesn't have `/profile.html`**.

Without `try_files`, NGINX would return:

```
404 Not Found
```

With this rule:

```
try_files $uri $uri/ /index.html;
```

NGINX does:

1️⃣ try `/profile`  
2️⃣ try `/profile/`  
3️⃣ serve `/index.html`

Then React/Vue router handles the route.

---

# 8. Closing the location block

```
}
```

Ends:

```
location /
```

---

# 9. Second location block

```
location /api/ {
```

This handles **backend API requests**.

Example requests:

```
/api/users
/api/login
/api/products
```

Everything starting with `/api/`.

---

# 10. `proxy_pass`

```
proxy_pass http://backend:8000;
```

This turns NGINX into a **reverse proxy**.

Meaning:

> Forward the request to another server.

---

## `http://`

Protocol.

---

## `backend`

This is **NOT localhost**.

In Docker Compose:

```
services:
  backend:
```

Docker automatically creates a **network DNS name**.

So:

```
backend
```

resolves to the backend container.

---

## `:8000`

Port where Django runs.

Example:

```
gunicorn
daphne
uvicorn
```

usually run on port **8000**.

---

### What happens in practice

User request:

```
GET /api/users
```

NGINX receives it and sends to:

```
http://backend:8000/api/users
```

Then returns Django's response.

---

# 11. `proxy_set_header`

These lines forward request metadata.

---

## First header

```
proxy_set_header Host $host;
```

### `Host`

HTTP header:

```
Host: example.com
```

### `$host`

NGINX variable for the original host.

Without this, Django would think the request came from:

```
backend:8000
```

instead of:

```
example.com
```

---

## Second header

```
proxy_set_header X-Real-IP $remote_addr;
```

### `X-Real-IP`

Header telling backend:

```
The user's real IP
```

### `$remote_addr`

NGINX variable containing:

```
Client IP address
```

Example:

```
203.0.113.4
```

---

## Third header

```
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

This keeps track of **all proxy hops**.

Example header chain:

```
Client → NGINX → Django
```

Header becomes:

```
X-Forwarded-For: client-ip
```

If more proxies exist, it becomes a list.

Django uses this for:

- logging
    
- rate limiting
    
- security checks
    

---

# 12. Final closing braces

```
}
```

Closes:

```
location /api/
```

---

```
}
```

Closes:

```
server
```

---

# Final Architecture (what this config actually creates)

```
User Browser
      │
      ▼
   NGINX (port 80)
      │
      ├── "/" → serve frontend files
      │
      └── "/api/" → proxy to Django
                        │
                        ▼
                  backend:8000
```

So your stack is:

```
NGINX
 ├─ Static frontend
 └─ Reverse proxy → Django
```

---

# One subtle thing many people miss

Notice:

```
location /
location /api/
```

NGINX chooses **the most specific match**.

So:

```
/api/users
```

goes to:

```
location /api/
```

NOT the root.

---

If you'd like, I can also show you the **exact request flow inside Docker** (container → container networking → NGINX → Django), which usually makes this entire setup click instantly.
