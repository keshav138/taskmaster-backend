You've hit on two massive fundamentals of Django REST Framework (DRF). Let's clear up exactly what's happening with the data, and then define those built-in keywords.

### 1. The `data=request.data` vs. `request.user` Distinction

First, a quick clarification on which view is doing what. You are actually looking at two _different_ behaviors here (Incoming vs. Outgoing):

- **In `RegisterView` (Incoming Data):** We used `serializer = self.get_serializer(data=request.data)`. By specifically including the **`data=`** keyword argument, you are telling the serializer: _"Act as the Customs Officer. Here is some raw, untrusted JSON from the frontend. Please inspect and validate it."_ This is called **Deserialization**.
    
- **In `CurrentUserView` (Outgoing Data):** We used `serializer = UserSerializer(request.user)`. Notice there is **no** `data=` argument. By just passing the database object directly, you are telling the serializer: _"Act as the Translator. Take this trusted database object and turn it into safe JSON so I can send it to the browser."_ This is called **Serialization**.
    

**Does this happen automatically because of `ModelSerializer`?**

Yes! Because you inherited from `ModelSerializer`, DRF automatically knows _how_ to map a Django object to JSON (and vice versa) based on the fields you defined in the `Meta` class. However, it isn't fully automatic—you still have to manually hand the data to the serializer in your view and tell it which _direction_ the data is flowing (incoming `data=` vs outgoing object).

### 2. Built-in Keywords (Class Attributes)

You noticed a very important pattern! You mentioned `password_classes`, but I believe you are looking at **`permission_classes`**.

Yes, `permission_classes`, along with a few others, are **built-in DRF keywords** (technically called "class attributes").

When you inherit from a DRF base class like `APIView` or `generics.CreateAPIView`, those base classes are hardcoded under the hood to look for variables with these exact names. If you misspell them (like writing `permissions_class` with an 's' instead of `permission_classes`), DRF will silently ignore them and use its default settings.

Here are the built-in keywords you have used in your views so far:

- **`permission_classes = [...]`**: DRF actively looks for this keyword before running any code to decide who is allowed to access the URL (e.g., `IsAuthenticated`, `AllowAny`).
    
- **`serializer_class = ...`**: DRF generic views look for this to know which serializer to use automatically when generating forms or validating data.
    
- **`queryset = ...`**: DRF generic views look for this keyword to know which database table it should be pulling from or saving to.
    

**Noted for the future:** You got it. From now on, whenever we write a new class, I will explicitly point out which variables are mandatory built-in DRF keywords and which ones are just custom variables we named ourselves.

Now that the logic is totally clear, **shall we write the `urls.py` file to finally wire these endpoints to the internet so you can test them?**