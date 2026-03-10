# 1. Base Image
FROM python:3.12-slim

# 2. Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


# 3. System Dependencies (Required for PostgreSQL)
RUN apt-get update && apt-get install -y \
gcc \
libpq-dev \
&& rm -rf /var/lib/apt/lists/*


# 4. Setup work dir
WORKDIR /app

# 5. Install python dependencies
# copy requirements.txt from backend/ to app/
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy application code
# This copies the inner backend code folder into /app/
COPY . /app/

# 7. Update work directory for django
# shifting to where manage.py is 
WORKDIR /app/taskmaster/


# 8. Expose port
EXPOSE 8000
