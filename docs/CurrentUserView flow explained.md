```python

class CurrentUserView(APIView):
    '''
    Get current user's info
    GET api/auth/user
    Serialization
    '''

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
        
```


This is the perfect question to ask right now. When you type `request.user`, it feels like you're pulling data out of thin air. How does the server know who `request.user` is if it's a completely stateless API that doesn't use cookies?

This is where the settings you configured earlier step in and do the heavy lifting. Think of this as a highly efficient data pipeline running just _before_ your View is allowed to execute.

Here is the exact step-by-step breakdown of how that user object gets magically attached to the `request`.

### 1. The HTTP Header (The Delivery)

When your frontend wants to get the current user's profile, it sends a `GET` request to `/api/auth/user/`. But it doesn't just send an empty request; it secretly attaches a special HTTP Header that looks like this:

`Authorization: Bearer eyJhbGciOiJIUzI1... (your long access token)`

### 2. The Interception (The Bouncer)

Before your `CurrentUserView` is ever allowed to run, Django REST Framework (DRF) pauses the request. It looks at your `settings.py` file and sees this:

Python

```
'DEFAULT_AUTHENTICATION_CLASSES': [
    'rest_framework_simplejwt.authentication.JWTAuthentication',
]
```

DRF hands the raw request to this `JWTAuthentication` class. This class acts as the bouncer at the front door.

### 3. Decoding the Math (The Check)

The `JWTAuthentication` class rips the token out of the `Authorization` header.

- It uses your server's secret key to mathematically verify that the token wasn't forged by a hacker.
    
- It checks the expiration date to ensure the token hasn't died.
    
- If it passes these checks, it decodes the payload. Hidden inside that payload is a tiny piece of JSON that looks like this: `{"user_id": 4}`.
    

### 4. The Database Query

Now the authenticator knows _who_ the token belongs to (User #4). It instantly runs a fast PostgreSQL query in the background:

`SELECT * FROM auth_user WHERE id = 4;`

### 5. Attaching the Object

The authenticator takes that database row, turns it into a Python `User` object, and glues it directly onto the `request` variable.

It literally executes: `request.user = fetched_user_object`.

### 6. Hand-off to Your View

Only _after_ all of this is successful does DRF finally hand the `request` over to your `CurrentUserView`.

By the time your code runs:

Python

```
def get(self, request):
    serializer = UserSerializer(request.user) 
```

...the `request` object has already been fully pre-loaded with the correct user data. You don't have to write any database lookups yourself!

**(Important Note):** Because JWT is stateless, this entire 6-step process happens on **every single API request** you make to a protected URL. The server forgets who you are the millisecond the response is sent, and reconstructs your identity from scratch the next time you send the token.

Now that the entire authentication flow is demystified—from the database constraints to the middleware interception—are you ready to fire up an API client like Postman or Thunder Client to actually register a user and get these tokens?