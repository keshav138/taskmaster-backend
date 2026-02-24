# TaskMaster - Project Management API

A comprehensive REST API for project and task management with real-time collaboration features.

![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![Django](https://img.shields.io/badge/django-5.0-green.svg)
![DRF](https://img.shields.io/badge/DRF-3.14-red.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue.svg)

## 🚀 Features

- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Project Management** - Create, manage, and collaborate on projects
- ✅ **Task Management** - Advanced task tracking with filtering and search
- ✅ **Comments System** - Collaborate with team members
- ✅ **Activity Logging** - Track all project changes
- ✅ **Advanced Filtering** - Filter by status, priority, dates, and more
- ✅ **Pagination** - Efficient data loading
- ✅ **API Documentation** - Interactive Swagger UI

## 🛠️ Tech Stack

- **Backend:** Django 5.0, Django REST Framework
- **Database:** PostgreSQL
- **Authentication:** JWT (djangorestframework-simplejwt)
- **Documentation:** drf-yasg (Swagger/OpenAPI)
- **Filtering:** django-filter

## 📋 Prerequisites

- Python 3.10+
- PostgreSQL 15+
- pip & virtualenv

## 🔧 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/taskmaster.git
cd taskmaster
```

### 2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 5. Setup database
```bash
# Create PostgreSQL database
createdb taskmaster_db

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 6. Run development server
```bash
python manage.py runserver
```

Visit `http://localhost:8000/api/docs/` for API documentation.

## 📚 API Documentation

Interactive API documentation is available at:
- **Swagger UI:** `http://localhost:8000/api/docs/`
- **ReDoc:** `http://localhost:8000/api/redoc/`

### Authentication

Most endpoints require JWT authentication. To get started:

1. Register a new user: `POST /api/auth/register/`
2. Login to get tokens: `POST /api/auth/login/`
3. Use access token in headers: `Authorization: Bearer <your_access_token>`

### Key Endpoints

#### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Get JWT tokens
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/user/` - Get current user info

#### Projects
- `GET /api/projects/` - List all projects
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}/` - Get project details
- `PUT/PATCH /api/projects/{id}/` - Update project
- `DELETE /api/projects/{id}/` - Delete project
- `POST /api/projects/{id}/add_member/` - Add team member
- `GET /api/projects/{id}/activities/` - Get activity feed

#### Tasks
- `GET /api/tasks/` - List tasks (with filters)
- `POST /api/tasks/` - Create task
- `GET /api/tasks/{id}/` - Get task details
- `PUT/PATCH /api/tasks/{id}/` - Update task
- `POST /api/tasks/{id}/assign/` - Assign task
- `POST /api/tasks/{id}/change_status/` - Change status
- `GET /api/tasks/my_tasks/` - Get my tasks
- `GET /api/tasks/overdue/` - Get overdue tasks

#### Comments
- `GET /api/comments/` - List comments
- `GET /api/tasks/{id}/comments/` - Get task comments
- `POST /api/tasks/{id}/comments/` - Add comment
- `PATCH /api/comments/{id}/` - Edit comment
- `DELETE /api/comments/{id}/` - Delete comment

## 🔍 Filtering & Search

Tasks support advanced filtering:
```bash
# Filter by status
GET /api/tasks/?status=TODO&status=IN_PROGRESS

# Filter by priority
GET /api/tasks/?priority=HIGH&priority=URGENT

# Search in title/description
GET /api/tasks/?search=design

# Date range
GET /api/tasks/?due_after=2026-02-01&due_before=2026-02-28

# Combine filters
GET /api/tasks/?project=1&status=TODO&assigned_to_me=true&ordering=-due_date
```

## 📦 Project Structure
```
taskmaster/
├── taskmaster/          # Project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── tasks/              # Main app
│   ├── models.py       # Database models
│   ├── serializers.py  # DRF serializers
│   ├── views.py        # API views
│   ├── permissions.py  # Custom permissions
│   ├── filters.py      # Custom filters
│   ├── pagination.py   # Pagination classes
│   ├── signals.py      # Django signals
│   └── urls.py         # URL routing
├── requirements.txt    # Dependencies
├── .env.example       # Environment template
└── README.md          # This file
```

## 🧪 Testing
```bash
# Run tests
python manage.py test

# With coverage
coverage run --source='.' manage.py test
coverage report
```

## 🚀 Deployment

Ready for deployment on Railway, Render, or any platform supporting Django/PostgreSQL.

See deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Keshav Maiya - [GitHub](https://github.com/keshav138)

## 🙏 Acknowledgments

Built with Django REST Framework and PostgreSQL.