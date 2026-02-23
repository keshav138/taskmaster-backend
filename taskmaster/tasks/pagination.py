from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class CustomPaginationResponse(PageNumberPagination):
    """
    Custom pagination with enhanced metadata 
    """

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count' : self.page.paginator.count,
            'total_pages' : self.page.paginator.num_pages,
            'current_page' : self.page.number,
            'next' : self.get_next_link(),
            'previous' : self.get_previous_link(),
            'results' : data
        })

class StandardResultsSetPagination(CustomPaginationResponse):
    """
    Standard pagination - 20 items per page 
    Inherits all defaults from CustomPaginationResponse
    """

class LargeResultsSetPagination(CustomPaginationResponse):
    """
    Large pagination - 50 items per page
    For activity fields, comments 
    """

    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

