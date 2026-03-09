import django_filters

from django.utils import timezone
from datetime import timedelta

from .models import Project, Task
from django.db.models import Q


class TaskFilter(django_filters.FilterSet):
    """
    Advanced filtering for tasks
    """

    # Text search across multiple fields
    search = django_filters.CharFilter(method='filter_search', label='Search')

    # Date range filtering
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    due_after = django_filters.DateTimeFilter(field_name='due_date', lookup_expr='gte')
    due_before = django_filters.DateTimeFilter(field_name='due_date', lookup_expr='lte')

    #multiple choice filtering
    status = django_filters.MultipleChoiceFilter(choices=Task.STATUS_CHOICES)
    priority = django_filters.MultipleChoiceFilter(choices=Task.PRIORITY_CHOICES)

    # Boolean filtering
    has_due_date = django_filters.BooleanFilter(method='filter_has_due_date')
    is_assigned = django_filters.BooleanFilter(method='filter_is_assigned')

    # Dynamic boolean filters
    assigned_to_me = django_filters.BooleanFilter(method='filter_assigned_to_me')
    created_by_me = django_filters.BooleanFilter(method='filter_created_by_me')
    overdue = django_filters.BooleanFilter(method='filter_overdue')
    due_this_week = django_filters.BooleanFilter(method='filter_due_this_week')


    class Meta:
        model = Task
        fields = ['project', 'status', 'priority','assigned_to', 'created_by']
    
    
    def filter_search(self, queryset, name, value):
        ''' Search in title and description '''
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )
    
    def filter_has_due_date(self, queryset, name, value):
        ''' Filter tasks with assigned/unassigned tasks '''
        if value:
            return queryset.exclude(due_date__isnull=True) ## we exclude those where due_data is null
        return queryset.filter(due_date__isnull=True) ## we include those whose due_date is null

    def filter_is_assigned(self, queryset, name, value):
        ''' Filter tasks with assigned/unassigned tasks '''
        if value:
            return queryset.exclude(assigned_to__isnull=True) ## we exclude those where due_data is null
        return queryset.filter(assigned_to__isnull=True) ## we include those whose due_date is null
    
    def filter_assigned_to_me(self, queryset, name, value):
        ''' Filter tasks assigned to user making API request'''
        if value:
            return queryset.filter(assigned_to=self.request.user)
        return queryset

    def filter_created_by_me(self, queryset, name, value):
        """ Filter tasks created by the user sending the request"""
        if value:
            return queryset.filter(created_by = self.request.user)
        return queryset
    
    def filter_overdue(self, queryset, name, value):
        """ Filter tasks which are overdue """
        if value:
            return queryset.filter(due_date__lt = timezone.now()).exclude(status='DONE')
        return queryset
    
    def filter_due_this_week(self, queryset, name, value):
        """ Filter task which are due this week """
        if value:
            now = timezone.now()
            next_seven = now + timedelta(days=7)

            return queryset.filter(
                due_date__range = [now, next_seven]
            ).exclude(status='DONE')
        
        return queryset


class ProjectFilter(django_filters.FilterSet):
    """
    Filter for projects 
    """

    search = django_filters.CharFilter(method='filter_search', label='Search')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Project
        fields = ['created_by']
    
    def filter_search(self, queryset, name, value):
        '''
        Search in project name and description 
        '''

        return queryset.filter(
            Q(project_name__icontains = value) | Q(description__icontains = value)
        )

    
    