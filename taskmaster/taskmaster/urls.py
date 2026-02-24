"""
URL configuration for taskmaster project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi


# Swagger/OpenAPI configuration
schema_view = get_schema_view(
    openapi.Info(
        title='TaskMaster API',
        default_version='v1',
        description="""
        # TaskMaster - Project Management API

        A comprehensive REST API for project and task management with real-time collaboration features.
        
        ## Features
        - JWT Authentication
        - Project Management (CRUD)
        - Task Management with filtering & search
        - Comments & Collaboration
        - Activity Logging
        - Team Management
        
        ## Authentication
        Most endpoints require JWT authentication. Use '/api/auth/login/' to get your access token.
        Then include it in requests : 'Authorization : Bearer <your_token> 
        
        """,
        terms_of_service="",
        contact=openapi.Contact(email="flamingflamingocode@gmail.com"),
        license=openapi.License(name='MIT License'),
    ),
    public=True, ## as in anyone can view the api docs
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tasks.urls')),

    # swagger documentation URL's
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),

]
