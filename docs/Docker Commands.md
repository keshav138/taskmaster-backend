These are the **Docker commands you’ll use most of the time in real development**. Think of them as covering the **entire lifecycle: build → run → inspect → debug → remove**.

---

# 1. `docker build`

Creates a **Docker image from a Dockerfile**.

You use it when you want to **package your application with its environment**.

Snippet:

```bash
docker build -t myapp .
```

Explanation:

- `-t` → tag/name of the image
    
- `.` → build context (current folder)
    

Typical workflow:

1. Write a `Dockerfile`
    
2. Build the image
    
3. Run containers from that image
    

Example Dockerfile concept:

```
FROM python:3.11
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

Now build:

```
docker build -t flask-app .
```

---

# 2. `docker pull`

Downloads an **image from Docker Hub or a registry**.

Example:

```bash
docker pull nginx
```

What happens:

Docker downloads layers like:

```
nginx:latest
↓
base OS layer
↓
nginx binaries
↓
config
```

Useful when you want **prebuilt software**.

Examples:

```
docker pull redis
docker pull postgres
docker pull node
```

---

# 3. `docker push`

Uploads your **image to a registry**.

Example:

```bash
docker push username/myapp
```

Typical workflow:

```
docker build -t username/myapp .
docker push username/myapp
```

Used when:

- sharing images
    
- CI/CD pipelines
    
- deployment servers
    

---

# 4. `docker run`

Creates **and starts a container from an image**.

This is the **most important Docker command**.

Example:

```bash
docker run nginx
```

Common options:

|Option|Meaning|
|---|---|
|`-d`|run in background|
|`-p`|port mapping|
|`--name`|container name|
|`-v`|mount volume|
|`-e`|environment variable|

Example:

```bash
docker run -d -p 8080:80 --name web nginx
```

Meaning:

```
host:8080 → container:80
```

---

# 5. `docker ps`

Lists **running containers**.

Example:

```bash
docker ps
```

Output example:

```
CONTAINER ID   IMAGE   STATUS   PORTS
abc123         nginx   Up       0.0.0.0:8080->80
```

Show **all containers**:

```bash
docker ps -a
```

---

# 6. `docker stop`

Stops a running container **gracefully**.

Example:

```bash
docker stop container_id
```

or

```bash
docker stop web
```

What happens:

```
SIGTERM → container shutdown
```

---

# 7. `docker start`

Starts a **previously stopped container**.

Example:

```bash
docker start web
```

Important difference:

```
docker run → creates new container
docker start → reuses existing container
```

---

# 8. `docker rm`

Removes a container.

Example:

```bash
docker rm web
```

Remove stopped containers.

Force remove:

```bash
docker rm -f web
```

Typical cleanup flow:

```
docker stop web
docker rm web
```

---

# 9. `docker images`

Lists **all images stored locally**.

Example:

```bash
docker images
```

Output:

```
REPOSITORY   TAG     IMAGE ID
nginx        latest  a1b2c3
myapp        latest  d4e5f6
```

Used to see:

- what images exist
    
- image size
    
- tags
    

---

# 10. `docker rmi`

Deletes an image.

Example:

```bash
docker rmi nginx
```

Or using ID:

```bash
docker rmi a1b2c3
```

Used when cleaning disk space.

---

# 11. `docker logs`

Shows **container output logs**.

Example:

```bash
docker logs web
```

Very important for debugging.

Follow logs live:

```bash
docker logs -f web
```

Similar to:

```
tail -f
```

---

# 12. `docker exec`

Runs a command **inside a running container**.

Example:

```bash
docker exec web ls
```

Most common usage:

```bash
docker exec -it web bash
```

Explanation:

- `-i` interactive
    
- `-t` terminal
    

This gives you a **shell inside the container**.

Useful for debugging.

Example:

```
docker exec -it postgres psql
```

---

# 13. `docker inspect`

Shows **detailed metadata of containers/images**.

Example:

```bash
docker inspect web
```

Returns JSON containing:

- IP address
    
- mounted volumes
    
- environment variables
    
- ports
    
- network config
    

Example usage:

```
docker inspect web | grep IPAddress
```

---

# 14. `docker compose up`

Starts **multi-container applications** defined in `docker-compose.yml`.

Example compose file:

```
services:
  web:
    build: .
    ports:
      - "8000:8000"

  redis:
    image: redis
```

Start everything:

```bash
docker compose up
```

Detached mode:

```bash
docker compose up -d
```

This starts:

```
web container
redis container
network
volumes
```

---

# 15. `docker compose down`

Stops and removes everything started by compose.

```bash
docker compose down
```

Removes:

- containers
    
- networks
    

Optional:

```
docker compose down -v
```

Also removes volumes.

---

# Typical Real-World Workflow

### 1️⃣ Build image

```bash
docker build -t myapi .
```

### 2️⃣ Run container

```bash
docker run -d -p 8000:8000 myapi
```

### 3️⃣ Check running containers

```bash
docker ps
```

### 4️⃣ Debug logs

```bash
docker logs container_id
```

### 5️⃣ Enter container

```bash
docker exec -it container_id bash
```

### 6️⃣ Stop container

```bash
docker stop container_id
```

---

💡 A useful mental model:

```
Image = blueprint
Container = running process
```

```
Dockerfile → build → Image → run → Container
```

---

If you'd like, I can also show you **the 8 Docker commands every backend developer memorizes (with typical interview questions)**. That helps make Docker usage feel much simpler.