from django.db.models.signals import post_save, m2m_changed, pre_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Project, Task, Activity, Comment


'''
post_save -> fires when any model instance is saved
reciever -> decorator that connects signal to function

created -> boolean flag that tells us if this is a new object (True) or an update(False)
'''

#================== Project Creator Auto Add =====================

@receiver(post_save, sender=Project)
def add_creator_to_team(sender, instance, created, **kwargs):
    '''
    Automatically add project_creator to project when created 
    '''

    if created and instance.created_by:
        instance.team_members.add(instance.created_by)



#================== Activity Logging =====================

@receiver(post_save, sender=Project)
def log_project_creation(sender, instance, created, **kwargs):
    """ Low when a project is created"""
    if created:
        Activity.objects.create(
            project = instance,
            user = instance.created_by,
            action = 'created project',
            details = f'Project "{instance.project_name}" was created'
        )


@receiver(post_save, sender=Task)
def log_task_activity(sender, instance, created, **kwargs):
    """ Log task creation """
    if created:
        # task created
        Activity.objects.create(
            project = instance.project,
            user = instance.created_by,
            action = 'created task',
            details = f'Task "{instance.title}" created'
        )


@receiver(post_save, sender=Comment)
def log_comment(sender, instance, created, **kwargs):
    """ Log when a comment is created """
    if created:
        Activity.objects.create(
            project = instance.task.project,
            user = instance.user,
            action = "added comment",
            details = f'Commented on task "{instance.task.title}"'
        )

@receiver(m2m_changed, sender = Project.team_members.through)
def log_team_member_changes(sender, instance, action, pk_set, **kwargs):
    """ Log when team members are added or removed"""

    if action=='post_add':
        for user_id in pk_set:
            user = User.objects.get(pk = user_id)

            if user != instance.created_by: ## because project creator is auto added, so to avoid him
                Activity.objects.create(
                    project = instance,
                    user = instance.created_by,
                    action = "added team member",
                    details = f'{user.username} was add to the project {instance.project_name}'
                )
    elif action=='post_remove':
        for user_id in pk_set:
            user = User.objects.get(pk = user_id)
            Activity.objects.create(
                project = instance,
                user = instance.created_by,
                action = 'removed team member',
                details = f'{user.username} removed from project {instance.project_name}'
            )

@receiver(pre_delete, sender=Task)
def log_task_deletion(sender, instance, **kwargs):
    """ Log when a task is deleted """
    Activity.objects.create(
        project = instance.project,
        user = instance.created_by,
        action = 'deleted task',
        details = f'Task {instance.title} was deleted'
    )
                




