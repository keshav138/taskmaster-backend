Search Filter and Pagination Polish

1. Added the DEFAULT_PAGINATION_CLASS : "rest_framework.pagination.PageNumberPagination" to settings.
2. Created a pagination.py , its need , and documentation => [[pagination.py]]
3. Created a filters.py , its need and documentation -> [[filters.py explanation]]
4. Updated views.py with pagination and advanced filtering -> [[views.py with advanced filtering and pagination]]
5. Updated activities action method inside project, because @action methods don't paginate automatically -> [[activities action method pagination update]]
6. Query optimisation in viewset -> [[Query Optimization in ViewSets]]