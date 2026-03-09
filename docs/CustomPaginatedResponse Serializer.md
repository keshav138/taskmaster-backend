You absolutely do not, and your intuition is spot on for questioning it. Writing massive, nested dictionaries over and over again violates the most sacred rule of programming: **DRY** (Don't Repeat Yourself).

If you have to write that ugly `openapi.Schema` block every time you paginate a custom action, your `views.py` will become unreadable.

Here is the secret "cheat code" that senior Django developers use to solve this exact problem: **The Dummy Serializer.**

Since `drf-yasg` is already an expert at reading standard Django Serializers, we can just build a fake serializer whose _only job_ is to act as a blueprint for the documentation.

### 1. Build the Blueprint (In `serializers.py`)

At the bottom of your `serializers.py` file, create a standard serializer that mimics your `CustomPaginationResponse` dictionary. Notice we use `serializers.Serializer` instead of `ModelSerializer` because this isn't touching the database.

Python

```
class PaginatedActivitySerializer(serializers.Serializer):
    """
    Dummy serializer strictly for Swagger documentation.
    Maps exactly to our CustomPaginationResponse format.
    """
    count = serializers.IntegerField(help_text="Total number of activities")
    total_pages = serializers.IntegerField(help_text="Total number of pages")
    current_page = serializers.IntegerField(help_text="Current active page")
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = ActivitySerializer(many=True) # <-- Plugs in your real data here!
```

### 2. Update the Decorator (In `views.py`)

Now look at how incredibly clean your `@swagger_auto_schema` becomes. You completely delete the massive `openapi.Schema` dictionary and just hand it the dummy serializer.

Python

```
    @swagger_auto_schema(
        operation_description="Get paginated activity feed for the project",
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, description="Page number", type=openapi.TYPE_INTEGER),
            openapi.Parameter('page_size', openapi.IN_QUERY, description="Results per page (max 100)", type=openapi.TYPE_INTEGER)
        ],
        responses={
            # Swagger instantly reads the dummy serializer and builds the UI!
            200: PaginatedActivitySerializer 
        }
    )
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
```

### Why this is the ultimate approach:

1. **It's Reusable:** If you ever build another paginated endpoint for activities, you just type `200: PaginatedActivitySerializer` and you're done.
    
2. **It Uses Tools You Know:** You are back to writing standard Django fields (`IntegerField`, `URLField`) instead of trying to memorize OpenAPI syntax (`openapi.TYPE_INTEGER`).
    
3. **It's Dynamic:** If you add a new field to your real `ActivitySerializer`, this dummy serializer automatically inherits the changes because it references `ActivitySerializer(many=True)` inside of it.
    

Your instincts were right—if a framework is forcing you to write 20 lines of messy dictionary code for a simple task, there is almost always a cleaner, class-based abstraction available.

**Would you like to move on to setting up your `settings.py` so we can permanently wire up your custom paginator and filters globally?**