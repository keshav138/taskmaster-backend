I’ll break this into **three practical parts**:

1. **How to write a Dockerfile (Docker image)**
    
2. **How to write a docker-compose file**
    
3. **The 8 Docker commands every backend developer memorizes**
    

The idea is to understand **why each piece exists**, not just copy syntax.

---

# 1. Writing a Docker Image (Dockerfile)

A **Docker image** is a packaged environment containing:

- OS base
    
- runtime (Python, Node, Java, etc.)
    
- dependencies
    
- your application
    
- startup command
    

Think of it as a **reproducible environment snapshot**.

The file used to define it is called:

```
Dockerfile
```

---

## Basic Dockerfile Structure

Example for a Python API:

```
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Now let's understand each instruction.

---

## 1. `FROM`

Defines the **base image**.

Example:

```
FROM python:3.11
```

This means:

```
Linux OS
+ Python runtime
+ system libraries
```

Common base images:

```
node:20
python:3.11
openjdk:17
nginx
alpine
ubuntu
```

---

## 2. `WORKDIR`

Sets the **working directory inside the container**.

```
WORKDIR /app
```

Equivalent to:

```
mkdir /app
cd /app
```

All later commands run inside this directory.

---

## 3. `COPY`

Copies files from **host → container**.

```
COPY requirements.txt .
```

Meaning:

```
host: requirements.txt
container: /app/requirements.txt
```

Another example:

```
COPY . .
```

Copies entire project.

---

## 4. `RUN`

Runs commands **during image build**.

Example:

```
RUN pip install -r requirements.txt
```

This installs dependencies **inside the image**.

Important idea:

```
RUN executes at build time
CMD executes at container start
```

---

## 5. `CMD`

Defines the **default command when container starts**.

Example:

```
CMD ["python", "app.py"]
```

This is the container’s main process.

If it stops → container stops.

---

## Example: Node API Dockerfile

```
FROM node:20

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

CMD ["node", "server.js"]
```

Build it:

```
docker build -t my-api .
```

Run it:

```
docker run -p 3000:3000 my-api
```

---

# Important Dockerfile Optimization

A very common pattern:

```
COPY package.json .
RUN npm install
COPY . .
```

Why?

Because Docker **caches layers**.

If you change code but not dependencies:

```
npm install layer is reused
```

Build becomes much faster.

---

# 2. Writing a docker-compose.yml

Docker compose is used for **multi-container applications**.

Example backend stack:

```
API
Database
Cache
Worker
```

Instead of running 4 long commands, you define them in **one file**.

---

## Basic docker-compose Structure

Example:

```
version: "3"

services:

  web:
    build: .
    ports:
      - "8000:8000"

  redis:
    image: redis

  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: password
```

---

## Core Concepts

### services

Each service = **container definition**

```
services:
  web:
  redis:
  db:
```

---

### build

Build image from Dockerfile.

```
build: .
```

Meaning:

```
use Dockerfile in current directory
```

---

### image

Use a **prebuilt image**.

```
image: redis
```

---

### ports

Port mapping.

```
ports:
  - "8000:8000"
```

Format:

```
host_port : container_port
```

Example:

```
localhost:8000 → container:8000
```

---

### environment

Set environment variables.

```
environment:
  POSTGRES_PASSWORD: password
  DEBUG: true
```

Equivalent to:

```
docker run -e POSTGRES_PASSWORD=password
```

---

### volumes

Persistent storage.

```
volumes:
  - ./data:/var/lib/postgresql/data
```

Meaning:

```
host folder → container folder
```

Used for:

```
databases
uploads
logs
```

---

### depends_on

Ensures startup order.

```
depends_on:
  - db
  - redis
```

Meaning:

```
start db first
then web
```

---

# Example: Realistic Backend Stack

```
version: "3"

services:

  api:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  db:
    image: postgres
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb

  redis:
    image: redis
```

Run everything:

```
docker compose up
```

Stop everything:

```
docker compose down
```

---

# 3. The 8 Docker Commands Developers Memorize

These cover **almost all daily Docker usage**.

---

## 1. Build image

```
docker build -t myapp .
```

Creates an image from Dockerfile.

---

## 2. Run container

```
docker run -p 8000:8000 myapp
```

Starts a container.

---

## 3. List running containers

```
docker ps
```

Shows active containers.

---

## 4. View logs

```
docker logs container_name
```

Debug application output.

---

## 5. Execute inside container

```
docker exec -it container_name bash
```

Open terminal inside container.

---

## 6. Stop container

```
docker stop container_name
```

Gracefully stops container.

---

## 7. Remove container

```
docker rm container_name
```

Deletes container.

---

## 8. Start multi-container app

```
docker compose up
```

Starts entire system defined in compose file.

---

# Typical Developer Workflow

Step 1 — write Dockerfile

```
Dockerfile
```

Step 2 — build image

```
docker build -t myapp .
```

Step 3 — run container

```
docker run -p 8000:8000 myapp
```

Step 4 — debug

```
docker logs container
docker exec -it container bash
```

Step 5 — production setup

```
docker compose up
```

---

💡 A useful mental model:

```
Dockerfile → builds Image
Image → runs Container
docker-compose → runs many containers together
```

---

If you'd like, I can also show you **the 5 Dockerfile mistakes almost every beginner makes (and how production teams structure them)** — that usually saves people a lot of debugging time.