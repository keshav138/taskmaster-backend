### 1. Infrastructure & Environment

- [ ] **Packages Installed**: You ran `pip install channels daphne channels-redis`.
    
- [ ] **Redis Running**: You have a local Redis server running on port `6379` (via Docker or local install).
    

### 2. Core Django Configuration (`settings.py`)

- [ ] **`INSTALLED_APPS`**: `daphne` is at the very top, and `channels` is added to your local apps.
    
- [ ] **Application Swap**: Commented out `WSGI_APPLICATION` and added `ASGI_APPLICATION = 'your_project.asgi.application'`.
    
- [ ] **Redis Config**: Added the `CHANNEL_LAYERS` dictionary pointing to `127.0.0.1:6379`.
    

### 3. Database & REST API (The Offline Fallback)

- [ ] **`models.py`**: Created the `Notification` model with fields for `recipient`, `message`, `task`, `is_read`, and `created_at`.
    
- [ ] **Migrations**: Ran `python manage.py makemigrations` and `python manage.py migrate`.
    
- [ ] **`serializers.py`**: Created `NotificationSerializer`.
    
- [ ] **`views.py`**:
    
    - Created `NotificationViewSet` with `get_queryset` filtering for the current user's unread alerts.
        
    - Added `@action` endpoints for `mark_read` and `mark_all_read`.
        
    - _(Don't forget the earlier fix!)_ Updated the `remove_member` action in `ProjectViewSet` to unassign active tasks and transfer created tasks to the project owner.
        
- [ ] **`urls.py`**: Registered the `notifications` ViewSet with your main DRF router.
    

### 4. The WebSocket Pipeline (The Real-Time Engine)

- [ ] **`asgi.py`**: Configured `ProtocolTypeRouter` to split standard HTTP traffic to Django and WebSocket traffic to Channels.
    
- [ ] **`middleware.py`**: Created `JWTAuthMiddleware` to extract the token from the query string, decode it securely, and attach the user to the connection `scope`.
    
- [ ] **`routing.py`**: Mapped `ws/notifications/$` to your consumer.
    
- [ ] **`consumers.py`**: Created `NotificationConsumer` to drop connecting users into their personal Redis group (`user_{id}_notifications`) and push JSON messages via the `send_notification` method.
    

### 5. Business Logic & Triggers (`signals.py` & `apps.py`)

- [ ] **`signals.py`**:
    
    - Wrote the `send_realtime_notification` helper function.
        
    - Added `pre_save` and `post_save` on the `Task` model for **Assignments** and **Status=DONE**.
        
    - Added `m2m_changed` on the `Project` model for **Team Invitations**.
        
    - Added `post_save` on the `Comment` model to notify the **Task Assignee** and **Task Creator**.
        
- [ ] **`apps.py`**: Overrode the `ready(self)` method to ensure `import your_app.signals` runs when the server boots.
    

---
