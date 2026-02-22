from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, LogoutView, CurrentUserView, ProjectViewSet, TaskViewSet


router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name = 'logout'),
    path('auth/user/', CurrentUserView.as_view(), name='current-user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    
    path('', include(router.urls)),
]

