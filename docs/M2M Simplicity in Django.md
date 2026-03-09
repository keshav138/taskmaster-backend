[[ManyToMany - Django]]
To write this **Many-to-Many** relationship in raw PostgreSQL, you would have to manually create **three separate tables**.

Django does all of this for you with that single `models.ManyToManyField` line, but "under the hood," this is the actual SQL structure being built:

### 1. The Setup (The Two Main Tables)

First, you need the table for Users and the table for Projects. These are standard.

SQL

```
-- 1. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL
);

-- 2. Create Projects Table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    description TEXT
);
```

### 2. The Magic (The Junction Table)

This is the part Django hides. You must create a third "intermediate" table (often called a **Junction Table**, **Join Table**, or **Through Table**) that links the other two.

SQL

```
-- 3. Create the Junction Table (The "Many-to-Many" Bridge)
CREATE TABLE project_team_members (
    id SERIAL PRIMARY KEY,
    
    -- Link to the Project
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Link to the User
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- CONSTRAINT: Prevent duplicate entries
    -- (So the same user isn't added to the same project twice)
    UNIQUE (project_id, user_id)
);
```

### 3. How Data Is Inserted

If you wanted to add "Alice" (User ID 1) and "Bob" (User ID 2) to the "Website Redesign" project (Project ID 5), you would run:

SQL

```
-- Add Alice to Project 5
INSERT INTO project_team_members (project_id, user_id) VALUES (5, 1);

-- Add Bob to Project 5
INSERT INTO project_team_members (project_id, user_id) VALUES (5, 2);
```

### 4. How Data Is Queried

If you wanted to find **"All members of the Website Redesign project,"** you would have to write a `JOIN` query:

SQL

```sql
SELECT users.username
FROM users
JOIN project_team_members ON users.id = project_team_members.user_id
WHERE project_team_members.project_id = 5;
```

### Summary

- **In Django:** You write **1 line** of code: `team_members = models.ManyToManyField(...)`.
    
- **In SQL:** You write **1 extra table definition** (with Foreign Keys and constraints) + complex `JOIN` queries to fetch the data.
    

This demonstrates why the ORM is so powerful—it abstracts away the complexity of managing that third table entirely.