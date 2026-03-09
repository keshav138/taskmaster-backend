**No, it does not do it automatically out of the box.** This is another one of those hidden `drf-yasg` quirks. If you just load up the Swagger UI right now, you won't see a way to log in. If you click "Try it out" on your `/api/tasks/` endpoint, it will instantly reject you with a `401 Unauthorized` error because Swagger doesn't know it's supposed to send a JWT token.

You have to explicitly teach Swagger how your security works by adding a specific configuration block to your **`settings.py`** file.

Once you add this code, Swagger will generate a green **"Authorize"** button at the top right of the documentation page.

Here is exactly what you need to paste into your `settings.py` to make the magic happen:

### 1. The Swagger Security Config

Add this dictionary anywhere inside your `settings.py`:

Python

```
# settings.py

SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Type in the *Value* input box below: **Bearer &lt;JWT_TOKEN&gt;**'
        }
    }
}
```

### How this works:

- **`type: 'apiKey'`**: Tells Swagger we are using token-based authentication (JWTs fall under this category in OpenAPI specs).
    
- **`name: 'Authorization'`**: This is the exact name of the HTTP Header that Swagger will attach to the outgoing request.
    
- **`in: 'header'`**: Tells Swagger where to put it.
    

### 🚨 The "Gotcha" when testing

When you click that new "Authorize" button on the webpage, a text box will pop up.

**You cannot just paste the raw token into the box.** Because Django strictly expects the word `Bearer` before the token, you must physically type:

`Bearer eyJhbGciOiJIUz...` into the Swagger UI text box.

Once you click save, Swagger will automatically attach that exact string to the `Authorization` header of every single "Try it out" request you make.

Since we are officially opening **`settings.py`** to fix the Swagger authentication, **are you ready to drop in the 4 lines of code right beneath this that will activate your custom pagination and filtering across the entire project?**