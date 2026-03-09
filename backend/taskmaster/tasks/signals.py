from django.db.models.signals import pre_save, post_save, m2m_changed, pre_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.contrib.auth.models import User
from .models import Project, Task, Activity, Comment, Notification


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
                

#================== Notification Tracking =====================#

# Broadcast function -> all signal redirect here
def send_realtime_notification(user, message, task=None):
    '''
    Helper function to save the notification to DB
    and broadcast it into WebSockets/Redis
    '''
    # save to postgres
    Notification.objects.create(recipient=user, message=message, task=task)
    
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{user.id}_notifications', 
        {
            'type' : 'send_notification',
            'message' : message
        }
    )


@receiver(pre_save, sender=Task)
def capture_old_task_state(sender, instance, **kwargs):
    """ Remember state of task before it changes"""
    if instance.pk:
        try:
            instance._old_state = Task.objects.get(pk = instance.pk)
        except Task.DoesNotExist:
            instance._old_state = None
    else:
        instance._old_state = None
        
@receiver(post_save, sender=Task)
def task_update_notifications(sender, instance, created, **kwargs):
    """ Trigger notifications based off of task changes"""
    
    if created:
        if instance.assigned_to:
            send_realtime_notification(
                instance.assigned_to,
                f"You were assigned to a new task: {instance.title}",
                instance
            )
    else:
        old_state = getattr(instance, '_old_state', None)
        if old_state:
            # CASE 1. Assignee changed
            if instance.assigned_to and instance.assigned_to != old_state.assigned_to:
                send_realtime_notification(
                    instance.assigned_to,
                    f"You have been assigned to: {instance.title}",
                    instance
                )
                
            # CASE 2: Status changed to DONE
            if instance.status == 'DONE' and old_state.status != 'DONE':
                assignee_name = instance.assigned_to.username if instance.assigned_to else 'Someone'
                send_realtime_notification(
                    instance.project.created_by,
                    f"{assignee_name} completed task: {instance.title}",
                    instance
                )
    
@receiver(m2m_changed, sender=Project.team_members.through)
def project_invitation_notification(sender, instance, action, pk_set, **kwargs):
    ''' Triggered when users are added into a project'''
    
    # post_add ensuring members we're successfully added to the db
    if action == 'post_add':
        users_added = User.objects.filter(pk__in = pk_set)
        
        for user in users_added:
            # dont notify the project creator if he add's himself
            if user != instance.created_by:
                send_realtime_notification(
                    user,
                    f"{instance.created_by.username} added you to the project {instance.project_name}"
                )
    
@receiver(post_save, sender=Comment)
def comment_notification(sender, instance, created, **kwargs):
    """ Notify relevant users about comments on their tasks"""
    if created:
        task = instance.task
        commenter = instance.user
        
        # 1. Notify person the task is assigned to
        if task.assigned_to and task.assigned_to != commenter:
            send_realtime_notification(
                task.assigned_to,
                f"{commenter.username} commented on your task : {task.title}",
                task
            )
        
        # 2. Notify the person who created the task
        if task.created_by != commenter and task.created_by != task.assigned_to:
            send_realtime_notification(
                task.created_by,
                f"{commenter.username} commented on a task you created: {task.title}"
            )