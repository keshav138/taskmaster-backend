// js/api.js

// Change this if your Django server runs on a different port
const API_BASE_URL = 'http://127.0.0.1:8000/api'; 

export const api = {
    // 1. Auth Utilities
    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },

    getAccessToken() {
        return localStorage.getItem('access_token');
    },

    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    isAuthenticated() {
        return !!this.getAccessToken();
    },

    // 2. Core Fetch Wrapper (The Interceptor)
    // We use this INSTEAD of standard fetch() throughout the app so headers are always attached.
    async fetchWithAuth(endpoint, options = {}) {
        const token = this.getAccessToken();
        
        // Setup default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Inject JWT if we have one
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // If the token expired (401), we should ideally try to use the refresh token here.
        // For V1, we will simply log the user out and redirect to login if unauthorized.
        if (response.status === 401) {
            console.warn("Unauthorized or token expired. Logging out.");
            this.clearTokens();
            window.location.href = 'login.html';
            throw new Error('Authentication required');
        }

        return response;
    },

    // 3. Specific Authentication API Calls
    async login(username, password) {
        // Simple JWT endpoints are usually /api/token/ or /api/token/obtain/
        const response = await fetch(`${API_BASE_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        this.setTokens(data.access, data.refresh);
        return data;
    },

    async register(userData) {
        // Adjust endpoint based on your DRF setup (e.g., /api/register/ or /api/users/)
        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }

        return await response.json();
    },

    async getCurrentUser() {
        const response = await this.fetchWithAuth('/auth/user/');
        if (!response.ok) throw new Error('Failed to fetch user');
        return await response.json();
    },

    async getAllUsers() {
        // GET /api/users/ 
        const response = await this.fetchWithAuth('/users/');
        if (!response.ok) throw new Error('Failed to fetch user directory');
        return await response.json();
    },

    async getProjectActivities(projectId) {
        // GET /api/projects/{id}/activities/
        const response = await this.fetchWithAuth(`/projects/${projectId}/activities/`);
        if (!response.ok) throw new Error('Failed to fetch project activities');
        return await response.json();
    },

    // 5. Project Methods
    async getProjects(params = {}) {
        // Convert an object like { search: "Website" } into "?search=Website"
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/projects/${queryString ? '?' + queryString : ''}`;
        
        const response = await this.fetchWithAuth(endpoint);
        if (!response.ok) throw new Error('Failed to fetch projects');
        return await response.json(); 
    },

    async getProjectDetails(projectId) {
        // GET /api/projects/{id}/
        const response = await this.fetchWithAuth(`/projects/${projectId}/`);
        if (!response.ok) throw new Error('Failed to fetch project details');
        return await response.json();
    },

    

    async updateProject(projectId, updateData) {
        // PATCH /api/projects/{id}/
        const response = await this.fetchWithAuth(`/projects/${projectId}/`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Django API Error (Update Project):", errorData);
            throw new Error("Failed to update project");
        }
        return await response.json();
    },

    async removeTeamMember(projectId, userId) {
        // POST /api/projects/{id}/remove_member/
        const response = await this.fetchWithAuth(`/projects/${projectId}/remove_member/`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Django API Error (Remove Member):", errorData);
            throw new Error("Failed to remove team member");
        }
        return await response.json();
    },

    async deleteProject(projectId) {
        // DELETE /api/projects/{id}/
        const response = await this.fetchWithAuth(`/projects/${projectId}/`, {
            method: 'DELETE'
        });
        
        if (!response.ok && response.status !== 204) {
            throw new Error('Failed to delete project');
        }
        return true;
    },

    async getProjectTasks(projectId) {
        // GET /api/projects/{id}/tasks/
        const response = await this.fetchWithAuth(`/projects/${projectId}/tasks/`);
        if (!response.ok) throw new Error('Failed to fetch project tasks');
        return await response.json();
    },

    

    async getTasks(params = {}) {
        // Convert an object like { project: 21, assigned_to_me: true } 
        // into a string like "project=21&assigned_to_me=true"
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/tasks/${queryString ? '?' + queryString : ''}`;
        
        const response = await this.fetchWithAuth(endpoint);
        if (!response.ok) throw new Error('Failed to fetch filtered tasks');
        return await response.json();
    },

    async createProject(projectData) {
        // POST /api/projects/
        const response = await this.fetchWithAuth('/projects/', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Django API Error (Create Project):", errorData);
            throw new Error("Failed to create project");
        }
        
        return await response.json();
    },

    async createTask(taskData) {
        const response = await this.fetchWithAuth('/tasks/', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            // Read the exact validation error from Django
            const errorData = await response.json();
            console.error("Django API Error:", errorData);
            throw new Error("API Validation Failed");
        }
        
        return await response.json();
    }, 

    async getTaskDetails(taskId) {
        const response = await this.fetchWithAuth(`/tasks/${taskId}/`);
        if (!response.ok) throw new Error('Failed to fetch task details');
        return await response.json();
    },

    async updateTask(taskId, updateData) {
        // We use PATCH because we are only sending the fields that changed
        const response = await this.fetchWithAuth(`/tasks/${taskId}/`, {
            method: 'PATCH',
            body: JSON.stringify(updateData)
        });
        if (!response.ok) throw new Error('Failed to update task');
        return await response.json();
    },

    async assignTask(taskId, assigneeId) {
        // POST /api/tasks/{id}/assign/
        // Send the ID, or null if unassigning
        const payload = { user_id : assigneeId || null }; 
        
        const response = await this.fetchWithAuth(`/tasks/${taskId}/assign/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Failed to assign task');
        return await response.json();
    },

    async deleteTask(taskId) {
        // DELETE /api/tasks/{id}/
        const response = await this.fetchWithAuth(`/tasks/${taskId}/`, {
            method: 'DELETE'
        });
        
        // A successful DELETE usually returns 204 No Content
        if (!response.ok && response.status !== 204) {
            throw new Error('Failed to delete task');
        }
        return true;
    },

    async getTaskComments(taskId) {
        const response = await this.fetchWithAuth(`/tasks/${taskId}/comments/`);
        if (!response.ok) throw new Error('Failed to fetch comments');
        return await response.json();
    },

    async addTaskComment(taskId, text) {
        const response = await this.fetchWithAuth(`/tasks/${taskId}/comments/`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error('Failed to add comment');
        return await response.json();
    },
    
    // --- NOTIFICATIONS API ---
    async getNotifications() {
        const response = await this.fetchWithAuth('/notifications/');
        if (!response.ok) throw new Error("Failed to fetch notifications");
        return await response.json();
    },

    async markNotificationRead(id) {
        const response = await this.fetchWithAuth(`/notifications/${id}/mark_read/`, { method: 'POST' });
        if (!response.ok) throw new Error("Failed to mark read");
        return await response.json();
    },

    async markAllNotificationsRead() {
        const response = await this.fetchWithAuth('/notifications/mark_all_read/', { method: 'POST' });
        if (!response.ok) throw new Error("Failed to clear notifications");
        return await response.json();
    },
    

};