from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
# Create your models here.


class Project(models.Model):
    '''
    Docstring for Project
    Represents a projects that contains tasks.
    Users can create projects and invite team members.
    '''
    
    project_name = models.CharField(max_length=200)
    description = models.TextField()
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name = 'owned_projects'
    )
    
    team_members = models.ManyToManyField(
        User,
        related_name='projects',
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now = True)

    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.project_name
    
    def save(self, *args, **kwargs):
        # auto add creator when he creates the project
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            self.team_members.add(self.created_by)
            

class Task(models.Model):
    '''
    Docstring for Task
    Individual tasks created within a project.
    Can be assigned to team members with priority and status tracking.
    '''

    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGESS', 'In Progress'),
        ('IN_REVIEW', 'In Review'),
        ('DONE', 'Done')
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent')
    ]

    title = models.CharField(max_length=200) 
    description = models.TextField(blank=True)
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_tasks'
    )
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="TODO"
    )
    
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )
    
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f'{self.title} - {self.project.project_name}'

    @property
    def is_overdue(self):
        '''
        Docstring for is_overdue
        
        Check if said task is past due date
        '''    
        
        if self.due_date and self.status != 'DONE':
            return timezone.now() > self.due_date
        return False


class Comment(models.Model):
    '''
    Comments on tasks for team collaboration

    '''

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='comments'   
    )
    
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.task.title}"
    
    
class Activity(models.Model):
    '''
    Docstring for Activity
    
    Activity log for all actions in a project
    '''

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='activities'
    )   

    user = models.ForeignKey(
        User,
        on_delete= models.CASCADE,
        related_name='activities'
    )
    
    action = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Activities'
    
    def __str__(self):
        return f"{self.user.username} - {self.action}"

    


