from django.apps import AppConfig
from django.conf.global_settings import DEFAULT_AUTO_FIELD

class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tasks'

    def ready(self):
        import tasks.signals