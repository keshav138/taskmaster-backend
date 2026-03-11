
### FIX
First off, seeing that Django login link is actually **fantastic news**. I know it looks broken, but it proves your Nginx reverse proxy is working flawlessly!

Here is exactly how that request flowed to give you that weird blank page, and how we fix it.

### The Journey of your Request 🗺️

When you physically type `http://4.240.96.118/api/docs/` and hit Enter, here is the exact relay race happening under the hood:

1. **The Front Door:** Your browser asks Azure for the page. Nginx (listening on Port 80) catches it.
    
2. **The Proxy:** Nginx sees `/api/` in the URL. It says, "Ah, my instructions say to pass this backward to the Django container on port 8000."
    
3. **The Bouncer (Django Auth):** Django receives the request for the Swagger docs. However, your Swagger library is likely configured to require users to be logged in to view the documentation. Since you aren't logged in, Django intercepts the request and spits out the HTML for its default login page instead.
    
4. **The Missing Paint (Static Files):** The browser receives the HTML for the login page and sees it needs CSS files to make it look pretty (usually located at a URL like `/static/admin/css/...`).
    
5. **The Dead End:** The browser asks Nginx for `/static/...`. Nginx checks its `nginx.conf`, realizes it has no idea what `/static/` is or where Django keeps those files, and returns nothing.
    

**The Result:** You get the raw, unstyled HTML text of a Django login link on a blank white screen.

---

### How to Fix It (The 2-Part Combo)

We need to solve two things: getting the CSS to show up, and getting past the login screen so you can actually see Swagger.

#### Part 1: Share Django's CSS with Nginx

Because `DEBUG=False` in production, Django refuses to serve its own CSS. We have to create a shared folder (a Docker Volume) so Nginx can reach into Django's pockets and serve the CSS for it.

**1. Update `docker-compose.yml` (on your laptop):**

We need to add a shared volume called `static_volume`.

YAML

```
    # Update your backend service
    backend:
        build: ./backend
        # ... your other settings ...
        volumes:
            - static_volume:/app/staticfiles  # Django puts CSS here
        
    # Update your frontend service
    frontend:
        build: ./frontend
        # ... your other settings ...
        volumes:
            - static_volume:/django_static  # Nginx reads CSS from here

# At the very bottom of the file, add it to your volumes list:
volumes:
    postgres_data:
    static_volume:
```

**2. Update `nginx.conf` (on your laptop):**

Add this tiny block right below your `/api/` block so Nginx knows how to serve the CSS:

Nginx

```
    # Serve Django Static Files (CSS/JS for Swagger and Admin)
    location /static/ {
        alias /django_static/;
    }
```

#### Part 2: The Swagger Login

Once you push those code changes and rebuild, the page will actually look like a real login screen.

To view the docs, you have two choices:

- **The Easy Way:** Go to your Django admin panel (usually `http://4.240.96.118/api/admin/`), log in with your superuser credentials, and then navigate back to `/api/docs/`. Swagger will see your active session and let you in.
    
- **The Code Way:** If you want the docs to be public for anyone to see without logging in, you'll need to go into your Django `urls.py` or Swagger settings and set the permission class to `AllowAny`.
    

**The Final Deployment Steps:**

1. Push those two file changes to GitHub.
    
2. Pull them on Azure.
    
3. Run `docker compose up -d --build`.
    
4. **Crucial Final Command:** Run this on the Azure terminal to tell Django to gather all its CSS and put it in that shared folder:
    
    `docker exec -it <your_backend_container_name> python manage.py collectstatic --noinput`
    

Do you want to get this static file fix out of the way, or would you rather run that SQL injection command we talked about earlier to get your database populated first?First off, seeing that Django login link is actually **fantastic news**. I know it looks broken, but it proves your Nginx reverse proxy is working flawlessly!

Here is exactly how that request flowed to give you that weird blank page, and how we fix it.

### The Journey of your Request 🗺️

When you physically type `http://4.240.96.118/api/docs/` and hit Enter, here is the exact relay race happening under the hood:

1. **The Front Door:** Your browser asks Azure for the page. Nginx (listening on Port 80) catches it.
    
2. **The Proxy:** Nginx sees `/api/` in the URL. It says, "Ah, my instructions say to pass this backward to the Django container on port 8000."
    
3. **The Bouncer (Django Auth):** Django receives the request for the Swagger docs. However, your Swagger library is likely configured to require users to be logged in to view the documentation. Since you aren't logged in, Django intercepts the request and spits out the HTML for its default login page instead.
    
4. **The Missing Paint (Static Files):** The browser receives the HTML for the login page and sees it needs CSS files to make it look pretty (usually located at a URL like `/static/admin/css/...`).
    
5. **The Dead End:** The browser asks Nginx for `/static/...`. Nginx checks its `nginx.conf`, realizes it has no idea what `/static/` is or where Django keeps those files, and returns nothing.
    

**The Result:** You get the raw, unstyled HTML text of a Django login link on a blank white screen.

---

### How to Fix It (The 2-Part Combo)

We need to solve two things: getting the CSS to show up, and getting past the login screen so you can actually see Swagger.

#### Part 1: Share Django's CSS with Nginx

Because `DEBUG=False` in production, Django refuses to serve its own CSS. We have to create a shared folder (a Docker Volume) so Nginx can reach into Django's pockets and serve the CSS for it.

**1. Update `docker-compose.yml` (on your laptop):**

We need to add a shared volume called `static_volume`.

YAML

```
    # Update your backend service
    backend:
        build: ./backend
        # ... your other settings ...
        volumes:
            - static_volume:/app/staticfiles  # Django puts CSS here
        
    # Update your frontend service
    frontend:
        build: ./frontend
        # ... your other settings ...
        volumes:
            - static_volume:/django_static  # Nginx reads CSS from here

# At the very bottom of the file, add it to your volumes list:
volumes:
    postgres_data:
    static_volume:
```

**2. Update `nginx.conf` (on your laptop):**

Add this tiny block right below your `/api/` block so Nginx knows how to serve the CSS:

Nginx

```
    # Serve Django Static Files (CSS/JS for Swagger and Admin)
    location /static/ {
        alias /django_static/;
    }
```

#### Part 2: The Swagger Login

Once you push those code changes and rebuild, the page will actually look like a real login screen.

To view the docs, you have two choices:

- **The Easy Way:** Go to your Django admin panel (usually `http://4.240.96.118/api/admin/`), log in with your superuser credentials, and then navigate back to `/api/docs/`. Swagger will see your active session and let you in.
    
- **The Code Way:** If you want the docs to be public for anyone to see without logging in, you'll need to go into your Django `urls.py` or Swagger settings and set the permission class to `AllowAny`.
    

**The Final Deployment Steps:**

1. Push those two file changes to GitHub.
    
2. Pull them on Azure.
    
3. Run `docker compose up -d --build`.
    
4. **Crucial Final Command:** Run this on the Azure terminal to tell Django to gather all its CSS and put it in that shared folder:
    
    `docker exec -it <your_backend_container_name> python manage.py collectstatic --noinput`
    

Do you want to get this static file fix out of the way, or would you rather run that SQL injection command we talked about earlier to get your database populated first?
