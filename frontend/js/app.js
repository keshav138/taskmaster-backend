// js/app.js
import { api } from './api.js';

// ==========================================
// 1. GLOBAL STATE
// ==========================================
let currentProjectId = null;
let currentProjectDetails = null;
let currentTaskId = null;
let currentUserId = null;
let currentFilters = {};
let currentTaskPage = 1;
const PAGE_SIZE = 10;
let allUsersCache = null;
let draggedTaskId = null;
let draggedTaskStatus = null; // <--- ADD THIS
let currentUser = null;

// --- ADD THE TRANSITION RULES ---
const ALLOWED_TRANSITIONS = {
    'TODO': ['IN_PROGRESS'],
    'IN_PROGRESS': ['IN_REVIEW', 'TODO'],
    'IN_REVIEW': ['DONE', 'IN_PROGRESS'],
    'DONE': ['IN_PROGRESS']
};

// --- ADD THE NEW PALETTE HELPER HERE ---
const USER_COLORS = [
    { bg: 'bg-[#d33f49]', text: 'text-white' },
    { bg: 'bg-[#002a32]', text: 'text-white' },
    { bg: 'bg-[#ffcdb2]', text: 'text-gray-900' }, 
    { bg: 'bg-[#260c1a]', text: 'text-white' },
    { bg: 'bg-[#420c14]', text: 'text-white' }
];

function getUserColor(identifier) {
    if (!identifier) return USER_COLORS[0];
    // Create a simple consistent hash from the username/id
    const hash = String(identifier).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
}

// ==========================================
// 2. CORE LOGIC & RENDERING FUNCTIONS
// ==========================================

async function loadProjectWorkspace(projectId) {
    try {
        closeAllPanels();
        currentProjectId = projectId;
        
        const [project, tasksData] = await Promise.all([
            api.getProjectDetails(projectId),
            api.getTasks({ project: projectId, page: currentTaskPage, page_size: PAGE_SIZE, ...currentFilters })
        ]);

        currentProjectDetails = project;

        // --- PERMISSION CHECK: Lock Invite & Delete Buttons if not the Creator ---
        if (currentUser && currentProjectDetails.created_by) {
            const creatorId = typeof currentProjectDetails.created_by === 'object' 
                ? currentProjectDetails.created_by.id 
                : currentProjectDetails.created_by;
                
            const isCreator = (currentUser.id === creatorId);
            
            // Your exact IDs from the HTML
            const inviteBtn = document.getElementById('btn-invite-member');
            const deleteBtn = document.getElementById('btn-delete-project');
            
            // 1. Handle the Invite Button
            if (inviteBtn) {
                if (!isCreator) {
                    // Disable and grey out
                    inviteBtn.disabled = true;
                    inviteBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    inviteBtn.classList.remove('group'); // Kills the fancy hover animation
                    inviteBtn.title = "Only the project creator can invite members.";
                } else {
                    // Enable and restore styling
                    inviteBtn.disabled = false;
                    inviteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    inviteBtn.classList.add('group');
                    inviteBtn.title = "";
                }
            }
        }

        renderProjectHeader(project);
        
        const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
        renderTaskBoard(tasksArray);
        renderKanbanBoard(tasksArray);
        renderAssigneeDropdown(project.team_members);
        renderTeamCards(project, tasksArray);
        renderPagination(tasksData); 

    } catch (error) {
        console.error("Failed to load workspace:", error);
    }
}

// OUTSIDE DOM LISTENER
// OUTSIDE DOM LISTENER
// OUTSIDE DOM LISTENER
async function openTaskPanel(taskId) {
    try {
        const [task, comments] = await Promise.all([
            api.getTaskDetails(taskId),
            api.getTaskComments(taskId)
        ]);

        const titleEl = document.getElementById('detail-task-title');
        if (titleEl) titleEl.value = task.title;

        const descInputEl = document.getElementById('detail-description');
        if (descInputEl) descInputEl.value = task.description || '';
        
        const statusEl = document.getElementById('detail-status-select');
        if (statusEl) {
            statusEl.value = task.status;
            
            // --- NEW: Lock invalid transition options ---
            const allowed = ALLOWED_TRANSITIONS[task.status] || [];
            Array.from(statusEl.options).forEach(option => {
                const targetStatus = option.value;
                // Allowed if it's the current status, or explicitly in our transition list
                const isAllowed = (targetStatus === task.status) || allowed.includes(targetStatus);
                
                option.disabled = !isAllowed;
                
                // Standardize names and append a visual lock cue
                const names = { 'TODO': 'To Do', 'IN_PROGRESS': 'In Progress', 'IN_REVIEW': 'In Review', 'DONE': 'Done' };
                option.textContent = isAllowed ? names[targetStatus] : `🔒 ${names[targetStatus]} (Locked)`;
            });
        }
        
        const priorityEl = document.getElementById('detail-priority');
        if (priorityEl) priorityEl.value = task.priority;
        
        const dateEl = document.getElementById('detail-due-date');
        if (dateEl) dateEl.value = task.due_date ? task.due_date.split('T')[0] : '';

        const assigneeSelect = document.getElementById('detail-assignee');
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
            if (currentProjectDetails && currentProjectDetails.team_members) {
                currentProjectDetails.team_members.forEach(member => {
                    const taskAssigneeId = task.assigned_to?.id || task.assigned_to;
                    const isSelected = (parseInt(taskAssigneeId, 10) === parseInt(member.id, 10)) ? 'selected' : '';
                    assigneeSelect.innerHTML += `<option value="${member.id}" ${isSelected}>${member.username}</option>`;
                });
            }
        }

        // --- BULLETPROOF AUTHORIZATION LOGIC ---
        // Force every single ID to be an integer so there are no "String vs Number" bugs
        const myId = parseInt(currentUserId, 10);
        const projectCreatorId = parseInt(currentProjectDetails?.created_by?.id || currentProjectDetails?.created_by, 10);
        const taskCreatorId = parseInt(task?.created_by?.id || task?.created_by, 10);
        const taskAssigneeId = parseInt(task?.assigned_to?.id || task?.assigned_to, 10);

        // Check our permissions! (isNaN checks ensure we don't accidentally match undefined fields)
        const canEditTask = (
            (!isNaN(projectCreatorId) && myId === projectCreatorId) ||
            (!isNaN(taskCreatorId) && myId === taskCreatorId) ||
            (!isNaN(taskAssigneeId) && myId === taskAssigneeId)
        );

        // Apply the locks
        const fieldsToLock = ['detail-status-select', 'detail-priority', 'detail-due-date', 'detail-assignee', 'detail-description'];        
        fieldsToLock.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) {
                el.disabled = !canEditTask; 
                if (!canEditTask) {
                    el.classList.add('bg-gray-100', 'cursor-not-allowed', 'opacity-60');
                } else {
                    el.classList.remove('bg-gray-100', 'cursor-not-allowed', 'opacity-60');
                }
            }
        });

        renderComments(comments);

        document.getElementById('task-detail-panel')?.classList.remove('translate-x-full');
        document.getElementById('panel-overlay')?.classList.remove('hidden');

    } catch (error) {
        console.error("Failed to load task details:", error);
    }
}   


function renderSidebarProjects(projects) {
    const container = document.getElementById('project-list-container');
    const template = document.getElementById('tmpl-project-link');
    container.innerHTML = ''; 

    projects.forEach(project => {
        const clone = template.content.cloneNode(true);
        const linkElement = clone.querySelector('a');
        
        linkElement.dataset.projectId = project.id; 
        // clone.querySelector('.project-name').textContent = `#${project.id} - ${project.project_name}`;
        clone.querySelector('.project-name').textContent = project.project_name;

        linkElement.addEventListener('click', (e) => {
            e.preventDefault();
            currentTaskPage = 1;
            loadProjectWorkspace(project.id);
        });

        container.appendChild(clone);
    });
}

// OUTSIDE DOM LISTENER
// OUTSIDE DOM LISTENER
function renderProjectHeader(project) {
    // 1. Title
    const titleEl = document.getElementById('project-title');
    if (titleEl) titleEl.textContent = project.project_name;

    // 2. Dynamic Description
    const descEl = document.getElementById('project-description');
    if (descEl) {
        if (project.description) {
            descEl.textContent = project.description;
            descEl.classList.remove('hidden');
        } else {
            descEl.classList.add('hidden'); // Hide it completely if empty
        }
    }

    // 3. Permissions Badge
    const creatorId = typeof project.created_by === 'object' ? project.created_by.id : project.created_by;
    const isCreator = (creatorId === currentUserId);
    
    const deleteBtn = document.getElementById('btn-delete-project');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !isCreator);

    const roleBadge = document.getElementById('project-role-badge');
    if (roleBadge) {
        if (isCreator) {
            roleBadge.textContent = 'Project Creator';
            roleBadge.className = 'px-4 py-2 text-sm font-medium rounded-lg border bg-purple-50 text-purple-700 border-purple-200';
        } else {
            roleBadge.textContent = 'Team Member';
            roleBadge.className = 'px-4 py-2 text-sm font-medium rounded-lg border bg-blue-50 text-blue-700 border-blue-200';
        }
    }

    // 4. Dynamic Colorful Avatars!
    const avatarsContainer = document.getElementById('project-members-avatars');
    const countEl = document.getElementById('project-members-count');

    if (avatarsContainer && countEl) {
        avatarsContainer.innerHTML = '';
        const members = project.team_members || [];
        
        countEl.textContent = `${members.length} member${members.length !== 1 ? 's' : ''}`;

        // REPLACE the "colors" array and the members loop with this:
        members.slice(0, 5).forEach((member) => {
            const initial = (member.first_name ? member.first_name[0] : member.username[0]).toUpperCase();
            const theme = getUserColor(member.username || member.id);

            avatarsContainer.innerHTML += `
                <div class="relative group cursor-pointer flex justify-center">
                    <div class="w-8 h-8 rounded-full border-2 border-white ${theme.text} text-xs font-bold flex items-center justify-center shadow-sm ${theme.bg} transition-transform group-hover:scale-110">
                        ${initial}
                    </div>
                    <div class="absolute bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap">
                        <div class="bg-gray-900 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow-lg relative">
                            ${member.username}
                            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        // If more than 5 members, show a "+X" bubble
        if (members.length > 5) {
            avatarsContainer.innerHTML += `
                <div class="w-8 h-8 rounded-full border-2 border-white text-gray-600 bg-gray-100 text-xs font-bold flex items-center justify-center shadow-sm">
                    +${members.length - 5}
                </div>
            `;
        }
    }
}

// OUTSIDE DOM LISTENER
function renderTaskBoard(tasks) {
    const containers = {
        'TODO': document.getElementById('todo-tasks-container'),
        'IN_PROGRESS': document.getElementById('in-progress-tasks-container'),
        'IN_REVIEW': document.getElementById('in-review-tasks-container'),
    };

    const completedContainer = document.getElementById('completed-tasks-container');
    if (completedContainer) completedContainer.innerHTML = '';
    let completedCount = 0;

    let counts = { 'TODO': 0, 'IN_PROGRESS': 0, 'IN_REVIEW': 0 };

    Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });
    const template = document.getElementById('tmpl-task-row');
    
    // --- NEW: Define current user and project creator IDs once before the loop ---
    const myId = parseInt(currentUserId, 10);
    const projectCreatorId = parseInt(currentProjectDetails?.created_by?.id || currentProjectDetails?.created_by, 10);

    tasks.forEach(task => {
        if (!containers[task.status] && task.status !== 'DONE') return; 

        const clone = template.content.cloneNode(true);
        clone.querySelector('.task-row').dataset.taskId = task.id;
        clone.querySelector('.task-title').textContent = task.title;
        clone.querySelector('.task-client').textContent = task.project || 'Internal'; 
        
        const descEl = clone.querySelector('.task-description');
        if (task.description) {
            descEl.textContent = task.description;
            descEl.classList.remove('hidden');
        } else {
            descEl.classList.add('hidden');
        }

        if (task.due_date) {
            const dateObj = new Date(task.due_date);
            clone.querySelector('.task-deadline').textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else {
            clone.querySelector('.task-deadline').textContent = 'No deadline';
        }

        // --- AUTHORIZATION CHECK FOR CHECKBOX ---
        const taskCreatorId = parseInt(task?.created_by?.id || task?.created_by, 10);
        const taskAssigneeId = parseInt(task?.assigned_to?.id || task?.assigned_to, 10);

        const canEditTask = (
            (!isNaN(projectCreatorId) && myId === projectCreatorId) ||
            (!isNaN(taskCreatorId) && myId === taskCreatorId) ||
            (!isNaN(taskAssigneeId) && myId === taskAssigneeId)
        );

        const checkbox = clone.querySelector('input[type="checkbox"]');
        if (checkbox && !canEditTask) {
            checkbox.disabled = true;
            checkbox.classList.add('cursor-not-allowed', 'opacity-50');
            checkbox.title = "Only the project creator, task creator, or assignee can complete this task.";
        }

        // --- DRAW CREATOR AVATAR ---
        const creatorContainer = clone.querySelector('.task-creator');
        if (creatorContainer) {
            creatorContainer.innerHTML = ''; 
            
            if (task.created_by) {
                const creatorName = typeof task.created_by === 'object' ? (task.created_by.username || task.created_by.first_name) : 'System';
                const initial = creatorName[0].toUpperCase();
                const theme = getUserColor(creatorName);
                
                creatorContainer.innerHTML = `
                    <div class="relative group cursor-pointer flex justify-center">
                        <div class="w-7 h-7 rounded-full border-2 border-white ${theme.text} text-[10px] font-bold flex items-center justify-center shadow-sm ${theme.bg}">
                            ${initial}
                        </div>
                        <div class="absolute bottom-full mb-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap">
                            <div class="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg relative">
                                Created by: ${creatorName}
                                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                creatorContainer.innerHTML = `<span class="text-xs text-gray-400">System</span>`;
            }
        }

        // --- DRAW ASSIGNEE AVATAR ---
        const assigneesContainer = clone.querySelector('.task-assignees');
        if (assigneesContainer) {
            assigneesContainer.innerHTML = ''; 
            
            if (task.assigned_to) {
                const assigneeName = typeof task.assigned_to === 'object' ? (task.assigned_to.username || task.assigned_to.first_name) : 'User';
                const initial = assigneeName[0].toUpperCase();
                const theme = getUserColor(assigneeName);
                
                assigneesContainer.innerHTML = `
                    <div class="relative group cursor-pointer flex justify-center">
                        <div class="w-7 h-7 rounded-full border-2 border-white ${theme.text} text-[10px] font-bold flex items-center justify-center shadow-sm ${theme.bg}">
                            ${initial}
                        </div>
                        <div class="absolute bottom-full mb-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap">
                            <div class="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg relative">
                                Assigned to: ${assigneeName}
                                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                assigneesContainer.innerHTML = `
                    <div class="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center" title="Unassigned">
                        <svg class="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                `;
            }
        }

        const priorityBadge = clone.querySelector('.task-priority');
        
        // --- NEW: BRANCHING LOGIC FOR DONE VS ACTIVE TASKS ---
        if (task.status === 'DONE') {
            completedCount++;
            if (completedContainer) {
                // Hide the checkbox since it's already done
                const checkbox = clone.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.classList.add('hidden');
                
                // Replace priority pill with a "Done" badge
                if (priorityBadge) {
                    priorityBadge.textContent = 'DONE';
                    priorityBadge.className = 'task-priority px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-gray-100 text-gray-600';
                }
                
                completedContainer.appendChild(clone);
            }
        } else {
            // It is an active task (TODO, IN_PROGRESS, or IN_REVIEW)
            counts[task.status]++; 
            
            if (priorityBadge) {
                priorityBadge.textContent = task.priority;
                priorityBadge.className = `task-priority px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${getPriorityColor(task.priority)}`;
            }

            containers[task.status].appendChild(clone);
        }
    });

    // Update the static bubbles with real math!
    const countTodo = document.getElementById('count-todo');
    const countProg = document.getElementById('count-in-progress');
    const countRev = document.getElementById('count-in-review');
    const countCompletedEl = document.getElementById('count-completed'); // NEW
    
    if (countTodo) countTodo.textContent = counts['TODO'];
    if (countProg) countProg.textContent = counts['IN_PROGRESS'];
    if (countRev) countRev.textContent = counts['IN_REVIEW'];
    if (countCompletedEl) countCompletedEl.textContent = completedCount; // NEW

    // --- EMPTY STATE LOGIC (LIST VIEW) ---
    const emptyTemplate = document.getElementById('tmpl-empty-state');
    
    Object.values(containers).forEach(container => {
        if (container && container.children.length === 0 && emptyTemplate) {
            container.appendChild(emptyTemplate.content.cloneNode(true));
        }
    });


    

    // NEW: Apply empty state to completed archive if nothing is done yet
    if (completedContainer && completedContainer.children.length === 0 && emptyTemplate) {
        completedContainer.appendChild(emptyTemplate.content.cloneNode(true));
    }
}

// OUTSIDE DOM LISTENER
function renderKanbanBoard(tasks) {
    const columns = {
        'TODO': document.querySelector('.kanban-column[data-status="TODO"]'),
        'IN_PROGRESS': document.querySelector('.kanban-column[data-status="IN_PROGRESS"]'),
        'IN_REVIEW': document.querySelector('.kanban-column[data-status="IN_REVIEW"]')
    };

    const counts = { 'TODO': 0, 'IN_PROGRESS': 0, 'IN_REVIEW': 0 };

    // Clear old cards
    Object.values(columns).forEach(c => { if(c) c.innerHTML = ''; });
    const template = document.getElementById('tmpl-kanban-card');

    // Define the current user and project creator once before the loop
    const myId = parseInt(currentUserId, 10);
    const projectCreatorId = parseInt(currentProjectDetails?.created_by?.id || currentProjectDetails?.created_by, 10);

    tasks.forEach(task => {
        if (!columns[task.status]) return;
        counts[task.status]++;

        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.kanban-card');
        card.dataset.taskId = task.id;

        clone.querySelector('.task-title').textContent = task.title;
        clone.querySelector('.task-client').textContent = task.project || 'Internal';

        // --- DESCRIPTION INJECTION LOGIC ---
        const descEl = clone.querySelector('.task-description');
        if (descEl) {
            if (task.description && task.description.trim() !== '') {
                descEl.textContent = task.description;
                descEl.classList.remove('hidden');
            } else {
                descEl.classList.add('hidden');
            }
        }

        if (task.due_date) {
            const dateObj = new Date(task.due_date);
            clone.querySelector('.task-deadline').textContent = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            clone.querySelector('.task-deadline').textContent = 'No Date';
        }

        const priorityBadge = clone.querySelector('.task-priority');
        priorityBadge.textContent = task.priority;
        priorityBadge.className = `task-priority px-2 py-1 text-[10px] font-bold uppercase rounded-full ${getPriorityColor(task.priority)}`;

        // Authorization Locks
        const taskCreatorId = parseInt(task?.created_by?.id || task?.created_by, 10);
        const taskAssigneeId = parseInt(task?.assigned_to?.id || task?.assigned_to, 10);

        const canEditTask = (
            (!isNaN(projectCreatorId) && myId === projectCreatorId) ||
            (!isNaN(taskCreatorId) && myId === taskCreatorId) ||
            (!isNaN(taskAssigneeId) && myId === taskAssigneeId)
        );

        if (!canEditTask) {
            card.removeAttribute('draggable');
            card.classList.remove('cursor-grab', 'active:cursor-grabbing');
            card.classList.add('cursor-not-allowed', 'opacity-75');
        } else {
            card.addEventListener('dragstart', () => {
            draggedTaskId = task.id;
            draggedTaskStatus = task.status; // Save original status!
            card.classList.add('opacity-50', 'scale-95');
            
            // VISUAL CUE: Gray out columns that are NOT allowed
            const allowed = ALLOWED_TRANSITIONS[task.status] || [];
            document.querySelectorAll('.kanban-column').forEach(col => {
                const colStatus = col.dataset.status;
                if (colStatus !== task.status && !allowed.includes(colStatus)) {
                    col.parentElement.classList.add('opacity-40', 'grayscale');
                }
            });
        });
        
        card.addEventListener('dragend', () => {
            draggedTaskId = null;
            draggedTaskStatus = null;
            card.classList.remove('opacity-50', 'scale-95');
            
            // Remove visual locks from all columns
            document.querySelectorAll('.kanban-column').forEach(col => {
                col.parentElement.classList.remove('opacity-40', 'grayscale', 'bg-gray-200');
            });
        });
        }

        card.addEventListener('click', async (e) => {
            if (!e.target.closest('[data-action="delete-task"]')) {
                currentTaskId = task.id;
                await openTaskPanel(task.id);
            }
        });

        columns[task.status].appendChild(clone);
    });

    // Update the number badges at the top of the columns
    document.querySelectorAll('.kanban-column').forEach(col => {
        const status = col.dataset.status;
        const countBadge = col.parentElement.querySelector('.kanban-count');
        if (countBadge) countBadge.textContent = counts[status];
    });

    // --- EMPTY STATE LOGIC (KANBAN VIEW) ---
    const emptyTemplate = document.getElementById('tmpl-empty-state');
    
    // Check every column. If it has 0 tasks, inject the empty state!
    Object.values(columns).forEach(column => {
        if (column && column.children.length === 0) {
            // For the Kanban view, we adjust the margins slightly so it fits the column nicely
            const emptyClone = emptyTemplate.content.cloneNode(true);
            const emptyDiv = emptyClone.querySelector('.empty-state-container');
            emptyDiv.classList.remove('mx-4'); 
            column.appendChild(emptyClone);
        }
    });
}


function renderTeamCards(project, allTasksForProject) {
    const container = document.getElementById('view-team');
    const template = document.getElementById('tmpl-team-card');
    container.innerHTML = '';

    if (!project.team_members || project.team_members.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No team members assigned.</p>';
        return;
    }

    // Parse IDs safely to ensure strict matching
    const creatorId = parseInt(typeof project.created_by === 'object' ? project.created_by.id : project.created_by, 10);
    const myId = parseInt(currentUserId, 10);
    const isCurrentUserCreator = (creatorId === myId);

    project.team_members.forEach(member => {
        const clone = template.content.cloneNode(true);
        const memberId = parseInt(member.id, 10);
        
        const createdCount = allTasksForProject.filter(t => t.created_by === member.id || t.created_by?.id === member.id).length;
        const assignedCount = allTasksForProject.filter(t => t.assigned_to === member.id || t.assigned_to?.id === member.id).length;

        const identifier = member.username || member.id;
        const initial = (member.first_name ? member.first_name[0] : member.username[0]).toUpperCase();
        const theme = getUserColor(identifier);

        clone.querySelector('.card-name').textContent = member.first_name ? `${member.first_name} ${member.last_name}` : member.username;
        clone.querySelector('.card-username').textContent = `@${member.username}`;
        clone.querySelector('.card-created-count').textContent = createdCount;
        clone.querySelector('.card-assigned-count').textContent = assignedCount;

        // --- NEW: Handle the Creator Badge ---
        const badgeEl = clone.querySelector('.card-role-badge');
        if (memberId === creatorId && badgeEl) {
            badgeEl.classList.remove('hidden');
        }

        // Apply the avatar initial and colors
        const avatarEl = clone.querySelector('.card-avatar');
        avatarEl.textContent = initial;
        avatarEl.className = `card-avatar w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${theme.bg} ${theme.text}`;

        const removeBtn = clone.querySelector('[data-action="remove-member"]');
        
        // --- UPDATED: Hide the remove button if this card belongs to the creator ---
        if (isCurrentUserCreator && memberId !== creatorId) {
            removeBtn.dataset.memberId = member.id;
            removeBtn.classList.remove('hidden'); // Ensure it's visible for normal members
        } else {
            // Hide it if I'm not the creator, OR if this specific card IS the creator
            removeBtn.classList.add('hidden');
        }

        container.appendChild(clone);
    });
}

function renderAssigneeDropdown(teamMembers) {
    const select = document.getElementById('new-task-assignee');
    if (!select) return;
    select.innerHTML = '<option value="">Unassigned</option>';
    if (teamMembers) {
        teamMembers.forEach(member => {
            select.innerHTML += `<option value="${member.id}">${member.username}</option>`;
        });
    }
}

function renderPagination(data) {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    if (!data || data.count === undefined || data.count === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const total = data.count;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (currentTaskPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(start + data.results.length - 1, total);

    const infoDiv = container.querySelector('.text-sm.text-gray-600');
    if (infoDiv) infoDiv.innerHTML = `Showing <span class="font-medium">${start}-${end}</span> of <span class="font-medium">${total}</span> tasks`;

    const btnContainer = container.querySelector('.flex.items-center.gap-2');
    if (btnContainer) {
        let buttonsHtml = '';
        const prevDisabled = !data.previous;
        const prevClass = prevDisabled ? "px-3 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-300 rounded-lg cursor-not-allowed opacity-50" : "px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50";
        buttonsHtml += `<button data-page="prev" class="${prevClass}" ${prevDisabled ? 'disabled' : ''}>Previous</button>`;

        for (let i = 1; i <= totalPages; i++) {
            const isActive = (i === currentTaskPage);
            const btnClass = isActive ? "px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg" : "px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg";
            buttonsHtml += `<button data-page="${i}" class="${btnClass}">${i}</button>`;
        }

        const nextDisabled = !data.next;
        const nextClass = nextDisabled ? "px-3 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-300 rounded-lg cursor-not-allowed opacity-50" : "px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50";
        buttonsHtml += `<button data-page="next" class="${nextClass}" ${nextDisabled ? 'disabled' : ''}>Next</button>`;

        btnContainer.innerHTML = buttonsHtml;
    }
}

function getPriorityColor(priority) {
    switch(priority) {
        case 'URGENT': return 'bg-red-100 text-red-800';
        case 'HIGH': return 'bg-orange-100 text-orange-800';
        case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
        case 'LOW': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function renderComments(comments) {
    const container = document.getElementById('comments-container');
    const template = document.getElementById('tmpl-comment');
    container.innerHTML = '';
    const commentsArray = Array.isArray(comments) ? comments : (comments.results || []);

    commentsArray.forEach(comment => {
        const clone = template.content.cloneNode(true);
        const username = comment.user ? comment.user.username : 'Unknown User';
        
        clone.querySelector('.comment-text').textContent = comment.text;
        clone.querySelector('.comment-author').textContent = username;
        
        // Setup Avatar with our new icons!
        const initial = username !== 'Unknown User' ? username[0].toUpperCase() : '?';
        const theme = getUserColor(username);
        const avatarEl = clone.querySelector('.comment-avatar');
        if (avatarEl) {
            avatarEl.textContent = initial;
            avatarEl.className = `comment-avatar w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${theme.bg} ${theme.text}`;
        }

        const date = new Date(comment.created_at);
        clone.querySelector('.comment-timestamp').textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        container.appendChild(clone);
    });
}

// OUTSIDE DOM LISTENER
function closeAllPanels() {
    document.getElementById('task-detail-panel')?.classList.add('translate-x-full');
    document.getElementById('panel-global-team')?.classList.add('translate-x-full');
    document.getElementById('panel-global-activities')?.classList.add('translate-x-full');
    document.getElementById('panel-overlay')?.classList.add('hidden');
}

function renderGlobalActivities(activities) {
    const container = document.getElementById('activities-list-container');
    const template = document.getElementById('tmpl-activity-item');
    
    // Clear the "Loading..." text
    container.innerHTML = '';

    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 italic">No recent activity found.</p>';
        return;
    }

    activities.forEach(activity => {
        const clone = template.content.cloneNode(true);
        
        // 1. Map the exact fields Django sent us
        const username = activity.user ? activity.user.username : 'Someone';
        const actionText = activity.details || activity.action || 'performed an action';
        
        // 2. Inject the text (making the username bold!)
        clone.querySelector('.activity-text').innerHTML = `<span class="font-semibold text-gray-900">${username}</span> ${actionText}`;
        
        // 3. Map the exact timestamp field
        if (activity.timestamp) {
            const date = new Date(activity.timestamp);
            clone.querySelector('.activity-timestamp').textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            clone.querySelector('.activity-timestamp').textContent = 'Just now';
        }
        
        container.appendChild(clone);
    });
}

function renderGlobalTeam(users) {
    const container = document.getElementById('global-team-grid');
    const template = document.getElementById('tmpl-global-user-card');
    container.innerHTML = '';

    users.forEach(user => {
        const clone = template.content.cloneNode(true);
        const identifier = user.username || user.id;
        const initial = (user.first_name ? user.first_name[0] : user.username[0]).toUpperCase();
        const theme = getUserColor(identifier);

        clone.querySelector('.card-name').textContent = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;
        clone.querySelector('.card-username').textContent = `@${user.username}`;
        clone.querySelector('.card-email').textContent = user.email || 'No email provided';
        
        // Apply the avatar initial and colors
        const avatarEl = clone.querySelector('.card-avatar');
        avatarEl.textContent = initial;
        // Keep the sizing/layout classes, but swap in the dynamic colors
        avatarEl.className = `card-avatar w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl mb-3 ${theme.bg} ${theme.text}`;

        container.appendChild(clone);
    });
}


// OUTSIDE DOM LISTENER
function renderSpotlightResults(projects, tasks) {
    const container = document.getElementById('spotlight-results');
    const dropdown = document.getElementById('spotlight-dropdown');
    const tmplProject = document.getElementById('tmpl-spotlight-project');
    const tmplTask = document.getElementById('tmpl-spotlight-task');

    container.innerHTML = '';

    if (projects.length === 0 && tasks.length === 0) {
        container.innerHTML = '<p class="p-6 text-sm text-gray-500 text-center italic">No matching projects or tasks found.</p>';
        dropdown.classList.remove('hidden');
        return;
    }

    // Render Matching Projects
    if (projects.length > 0) {
        const header = document.createElement('div');
        header.className = 'px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider';
        header.textContent = 'Projects';
        container.appendChild(header);

        projects.slice(0, 4).forEach(project => {
            const clone = tmplProject.content.cloneNode(true);
            const btn = clone.querySelector('button');
            btn.dataset.id = project.id;
            clone.querySelector('.item-title').textContent = project.project_name;
            container.appendChild(clone);
        });
    }

    // Render Matching Tasks
    if (tasks.length > 0) {
        const header = document.createElement('div');
        header.className = 'px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider';
        header.textContent = 'Tasks';
        container.appendChild(header);

        tasks.slice(0, 8).forEach(task => {
            const clone = tmplTask.content.cloneNode(true);
            const btn = clone.querySelector('button');
            btn.dataset.id = task.id;
            // Safely grab the project ID (handling different ways Django might serialize it)
            btn.dataset.projectId = typeof task.project === 'object' ? task.project.id : (task.project_id || task.project);
            
            clone.querySelector('.item-title').textContent = task.title;
            clone.querySelector('.item-subtitle').textContent = `Status: ${task.status.replace('_', ' ')}`;
            container.appendChild(clone);
        });
    }

    dropdown.classList.remove('hidden');
}

// ==========================================
// NOTIFICATIONS & WEBSOCKET ENGINE
// ==========================================
let notificationSocket = null;
let unreadCount = 0;

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    const clearBtn = document.getElementById('btn-clear-notifications');
    const emptyState = document.getElementById('notifications-empty');

    if (unreadCount > 0) {
        badge.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
        emptyState.classList.add('hidden');
    } else {
        badge.classList.add('hidden');
        clearBtn.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

function renderNotification(notif, prepend = false) {
    const msgText = typeof notif === 'string' ? notif : (notif.message || notif.content || notif.text);
    if (!msgText || msgText.trim() === '') return false; // THIS KILLS THE GHOST NOTIFICATIONS

    const list = document.getElementById('notifications-list');
    const template = document.getElementById('tmpl-notification');
    const clone = template.content.cloneNode(true);
    
    const item = clone.querySelector('.notification-item');
    item.dataset.id = notif.id || 'temp'; 
    
    clone.querySelector('.notification-message').textContent = msgText;
    
    // Format timestamp nicely if provided
    if (notif.created_at) {
        const date = new Date(notif.created_at);
        clone.querySelector('.notification-time').textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Optimistic UI interaction
    item.addEventListener('click', async () => {
        // Immediately dim the UI
        item.classList.add('opacity-50', 'pointer-events-none');
        item.querySelector('.notification-dot')?.classList.add('hidden');
        
        unreadCount = Math.max(0, unreadCount - 1);
        updateNotificationBadge();

        try {
            if (notif.id) await api.markNotificationRead(notif.id);
            // After successful API call, completely remove it from the list
            setTimeout(() => item.remove(), 300); 

            setTimeout(() => {
                if (document.querySelectorAll('.notification-item').length === 0) {
                    document.getElementById('notifications-empty').classList.remove('hidden');
                }
            }, 350);

        } catch (error) {
            console.error("Failed to mark read:", error);
            // Revert UI if server fails
            item.classList.remove('opacity-50', 'pointer-events-none');
            item.querySelector('.notification-dot')?.classList.remove('hidden');
            unreadCount++;
            updateNotificationBadge();
        }
    });

    if (prepend) {
        list.insertBefore(clone, list.firstChild);
    } else {
        list.appendChild(clone);
    }

    return true;
}

async function initNotifications() {
    try {
        const data = await api.getNotifications();
        const notifications = data.results || data; 
        
        // --- UPDATED: Only increment unreadCount if it actually rendered ---
        notifications.forEach(notif => {
            if (!notif.is_read) {
                const wasRendered = renderNotification(notif, false);
                if (wasRendered) {
                    unreadCount++;
                }
            }
        });
        updateNotificationBadge();

        const token = localStorage.getItem('access_token');
        if (token) {
            notificationSocket = new WebSocket(`ws://${window.location.host}/ws/notifications/?token=${token}`);            
            notificationSocket.onmessage = function(e) {
                const data = JSON.parse(e.data);
                const notifPayload = (data.message && typeof data.message === 'object') ? data.message : data;
                
                // --- UPDATED: Only update UI math if a real message came through ---
                const wasRendered = renderNotification(notifPayload, true); 
                
                if (wasRendered) {
                    unreadCount++;
                    updateNotificationBadge();
                }

                if (typeof currentProjectId !== 'undefined' && currentProjectId) {
                    loadProjectWorkspace(currentProjectId);
                }
            };
            
            notificationSocket.onclose = function() {
                console.warn('WebSocket disconnected. Real-time updates paused.');
            };
        }
    } catch (error) {
        console.error("Notification Init Error:", error);
    }
}

// 3. UI Event Listeners
document.getElementById('btn-notifications')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('notifications-dropdown').classList.toggle('hidden');
    document.getElementById('user-dropdown').classList.add('hidden'); // Close user menu if open
});

document.getElementById('btn-clear-notifications')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const list = document.getElementById('notifications-list');
    
    // Optimistic clear
    list.querySelectorAll('.notification-item').forEach(item => item.remove());
    unreadCount = 0;
    updateNotificationBadge();

    try {
        await api.markAllNotificationsRead();
    } catch (error) {
        console.error("Failed to clear all:", error);
        alert("Server error clearing notifications.");
    }
});

// Click outside to close dropdown
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifications-dropdown');
    const bellBtn = document.getElementById('btn-notifications');
    if (dropdown && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});


// ==========================================
// 3. EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    
    initNotifications();

    try {
        // Fetch the user data when the app boots up
        currentUser = await api.fetchWithAuth('/auth/user/').then(res => res.json());
    } catch (err) {
        console.error("Failed to load user profile", err);
    }

    // --- AUTH & INIT ---
    if (!api.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const [userData, projectsData] = await Promise.all([
            api.getCurrentUser(),
            api.getProjects()
        ]);

        currentUserId = userData.id;
        const initial = (userData.first_name ? userData.first_name[0] : userData.username[0]).toUpperCase();
        
        // --- ADDED: Get the theme for the logged-in user ---
        const theme = getUserColor(userData.username || userData.id); 

        // --- UPDATED: Apply the colors to the main Top Nav Avatar ---
        const btnUserMenu = document.getElementById('btn-user-menu');
        if (btnUserMenu) {
            btnUserMenu.textContent = initial;
            btnUserMenu.className = `w-9 h-9 ${theme.bg} ${theme.text} font-semibold text-sm rounded-full flex items-center justify-center hover:ring-2 ring-gray-300 transition-all`;
        }

        // Keep your existing dropdown text logic
        document.getElementById('dropdown-user-name').textContent = userData.first_name ? `${userData.first_name} ${userData.last_name}` : userData.username;
        document.getElementById('dropdown-user-email').textContent = userData.email || `@${userData.username}`;

        // --- ADDED: Apply the colors to the Comment Input Avatar in the slide-out panel ---
        const newCommentAvatar = document.getElementById('new-comment-avatar');
        if (newCommentAvatar) {
            newCommentAvatar.textContent = initial;
            newCommentAvatar.className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${theme.bg} ${theme.text}`;
        }

        // Keep your existing sidebar and workspace loading logic
        renderSidebarProjects(projectsData.results);
        
        if (projectsData.results.length > 0) {
            currentTaskPage = 1;
            loadProjectWorkspace(projectsData.results[0].id);
        }
    } catch (error) {
        console.error("Error loading initial data:", error);
    }

    // --- SIDEBAR NAVIGATION ---
    // --- SIDEBAR NAVIGATION (NOW USING PANELS) ---
    document.getElementById('nav-link-dashboard')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllPanels(); // Dashboard just closes the panels to reveal the workspace!
    });

    document.getElementById('nav-link-team')?.addEventListener('click', async (e) => {
        e.preventDefault();
        closeAllPanels();
        
        // Slide it open
        document.getElementById('panel-global-team').classList.remove('translate-x-full');
        document.getElementById('panel-overlay').classList.remove('hidden');
        
        try {
            const usersResponse = await api.getAllUsers();
            renderGlobalTeam(Array.isArray(usersResponse) ? usersResponse : (usersResponse.results || []));
        } catch (error) {
            console.error("Failed to load global team:", error);
        }
    });

    document.getElementById('nav-link-activities')?.addEventListener('click', async (e) => {
        e.preventDefault();
        closeAllPanels();
        
        // Slide it open
        document.getElementById('panel-global-activities').classList.remove('translate-x-full');
        document.getElementById('panel-overlay').classList.remove('hidden');
        
        const container = document.getElementById('activities-list-container');
        const projectNameSpan = document.getElementById('activity-project-name');

        if (!currentProjectId) {
            projectNameSpan.textContent = "No project selected";
            container.innerHTML = '<p class="text-sm text-gray-500 italic text-center mt-4">Select a project to view activities.</p>';
            return;
        }

        projectNameSpan.textContent = currentProjectDetails ? currentProjectDetails.project_name : `#${currentProjectId}`;
        container.innerHTML = '<p class="text-sm text-gray-500 italic text-center mt-4">Loading activities...</p>';
        
        try {
            const response = await api.getProjectActivities(currentProjectId);
            renderGlobalActivities(Array.isArray(response) ? response : (response.results || []));
        } catch (error) {
            container.innerHTML = '<p class="text-sm text-red-500 text-center mt-4">Failed to load activity feed.</p>';
        }
    });

    // --- USER MENU ---
    const btnUserMenu = document.getElementById('btn-user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    btnUserMenu?.addEventListener('click', (e) => {
        e.stopPropagation(); 
        userDropdown.classList.toggle('hidden');
    });

    

    document.getElementById('btn-logout')?.addEventListener('click', () => {
        api.clearTokens();
        window.location.href = 'login.html';
    });

    // --- VIEW TOGGLE TABS ---
    const tabButtons = document.querySelectorAll('[data-tab-target]');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.dataset.tabTarget;

            // 1. Hide ALL views (Added 'view-completed' to this array)
            const allViews = ['view-tasks', 'view-team', 'view-kanban', 'view-completed'];
            allViews.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            // 2. Show the newly selected view
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.remove('hidden');
                // Remove the flex grid if completed view is shown, ensuring it acts like a block
                if (targetId === 'view-completed') targetEl.classList.remove('flex');
            }

            // 3. Update active button styling (the white pill background)
            tabButtons.forEach(b => {
                b.classList.remove('text-gray-900', 'bg-white', 'shadow-sm');
                b.classList.add('text-gray-600');
            });
            btn.classList.remove('text-gray-600');
            btn.classList.add('text-gray-900', 'bg-white', 'shadow-sm');
        });
    });

    // --- FILTERS & SEARCH ---
    const filtersDropdown = document.getElementById('filters-dropdown');
    document.getElementById('btn-task-filters')?.addEventListener('click', (e) => {
        e.stopPropagation();
        filtersDropdown.classList.toggle('hidden');
    });
    filtersDropdown?.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) currentFilters[e.target.dataset.filter] = e.target.value;
            else delete currentFilters[e.target.dataset.filter];
            if (currentProjectId) { currentTaskPage = 1; loadProjectWorkspace(currentProjectId); }
        });
    });

    let taskSearchTimeout;
    document.getElementById('task-search')?.addEventListener('input', (e) => {
        clearTimeout(taskSearchTimeout);
        taskSearchTimeout = setTimeout(() => {
            const query = e.target.value.trim();
            if (query) currentFilters['search'] = query;
            else delete currentFilters['search'];
            if (currentProjectId) { currentTaskPage = 1; loadProjectWorkspace(currentProjectId); }
        }, 500); 
    });


    // INSIDE DOM LISTENER
    // --- UPGRADED SPOTLIGHT SEARCH ---
    let globalSearchTimeout;
    const globalSearchInput = document.getElementById('global-search');
    const spotlightDropdown = document.getElementById('spotlight-dropdown');

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            clearTimeout(globalSearchTimeout);
            const query = e.target.value.trim();

            if (!query) {
                spotlightDropdown?.classList.add('hidden');
                // Optional: Restore the left sidebar to show all projects if search is cleared
                api.getProjects().then(data => renderSidebarProjects(Array.isArray(data) ? data : (data.results || [])));
                return;
            }

            globalSearchTimeout = setTimeout(async () => {
                try {
                    // Fetch BOTH Projects and Tasks concurrently!
                    const [projectsData, tasksData] = await Promise.all([
                        api.getProjects({ search: query }),
                        api.getTasks({ search: query })
                    ]);

                    const projects = Array.isArray(projectsData) ? projectsData : (projectsData.results || []);
                    const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
                    
                    renderSpotlightResults(projects, tasks);
                } catch (error) { 
                    console.error("Spotlight search failed:", error); 
                }
            }, 500);
        });

        // Hide dropdown if you click away
        document.addEventListener('click', (e) => {
            if (spotlightDropdown && !spotlightDropdown.contains(e.target) && e.target !== globalSearchInput) {
                spotlightDropdown.classList.add('hidden');
            }
        });

        // Reopen dropdown if you click back into the search bar
        globalSearchInput.addEventListener('focus', (e) => {
            if (e.target.value.trim() && spotlightDropdown) {
                spotlightDropdown.classList.remove('hidden');
            }
        });
    }



    // --- PANEL ACTIONS (AUTO-SAVE & COMMENTS) ---
// --- PANEL ACTIONS (AUTO-SAVE & COMMENTS) ---
    const updatableFields = { 
        'detail-status-select': 'status', 
        'detail-priority': 'priority', 
        'detail-due-date': 'due_date',
        'detail-description': 'description' // <-- Added this line!
    };

    Object.keys(updatableFields).forEach(id => {
        document.getElementById(id)?.addEventListener('change', async (e) => {
            if (!currentTaskId) return;
            try {
                await api.updateTask(currentTaskId, { [updatableFields[id]]: e.target.value });
                loadProjectWorkspace(currentProjectId); 
            } catch (error) { alert("Failed to save changes."); }
        });
    });

    // 2. DEDICATED ASSIGNEE LOGIC (Using the new POST endpoint)
    document.getElementById('detail-assignee')?.addEventListener('change', async (e) => {
        if (!currentTaskId) return;
        const assigneeId = e.target.value ? parseInt(e.target.value, 10) : null;
        
        try {
            await api.assignTask(currentTaskId, assigneeId);
            loadProjectWorkspace(currentProjectId); // Refresh the board!
        } catch (error) { 
            console.error("Assignment failed:", error);
            alert("Failed to assign task. Check console."); 
        }
    });


    

    // --- MODALS ---
    const taskModal = document.getElementById('new-task-modal');
    const projectModal = document.getElementById('new-project-modal');
    const inviteModal = document.getElementById('invite-member-modal');

    document.getElementById('btn-close-task-modal')?.addEventListener('click', () => taskModal.classList.add('hidden'));
    document.getElementById('btn-cancel-task')?.addEventListener('click', () => taskModal.classList.add('hidden'));
    document.getElementById('btn-close-project-modal')?.addEventListener('click', () => projectModal.classList.add('hidden'));
    document.getElementById('btn-cancel-project')?.addEventListener('click', () => projectModal.classList.add('hidden'));
    document.getElementById('btn-close-invite-modal')?.addEventListener('click', () => inviteModal.classList.add('hidden'));
    document.getElementById('btn-cancel-invite')?.addEventListener('click', () => inviteModal.classList.add('hidden'));

    // CREATE PROJECT
    document.getElementById('btn-new-project')?.addEventListener('click', async () => {
        projectModal.classList.remove('hidden');
        if (!allUsersCache) {
            try {
                const data = await api.getAllUsers();
                allUsersCache = Array.isArray(data) ? data : (data.results || []);
                const list = document.getElementById('new-project-members-list');
                list.innerHTML = '';
                allUsersCache.forEach(user => {
                    list.innerHTML += `<label class="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1 rounded"><input type="checkbox" value="${user.id}" class="w-4 h-4 text-gray-900 rounded"><span class="text-sm text-gray-700">${user.username}</span></label>`;
                });
            } catch (error) { console.error(error); }
        }
    });

    document.getElementById('new-project-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-project');
        btn.disabled = true;
        try {
            const data = { project_name: document.getElementById('new-project-name').value.trim(), team_member_ids: Array.from(document.getElementById('new-project-members-list').querySelectorAll('input:checked')).map(cb => parseInt(cb.value, 10)) };
            if (document.getElementById('new-project-description').value) data.description = document.getElementById('new-project-description').value.trim();
            const project = await api.createProject(data);
            projectModal.classList.add('hidden');
            const projectsData = await api.getProjects();
            renderSidebarProjects(projectsData.results);
            currentTaskPage = 1;
            loadProjectWorkspace(project.id);
        } catch (error) { alert("Failed to create project."); } 
        finally { btn.disabled = false; }
    });

    // CREATE TASK
    document.getElementById('new-task-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-task');
        btn.disabled = true;
        try {
            const data = { title: document.getElementById('new-task-title').value, project_id: parseInt(currentProjectId, 10), status: document.getElementById('new-task-status').value, priority: document.getElementById('new-task-priority').value };
            if (document.getElementById('new-task-description').value) data.description = document.getElementById('new-task-description').value.trim();
            if (document.getElementById('new-task-due-date').value) data.due_date = new Date(document.getElementById('new-task-due-date').value).toISOString();
            if (document.getElementById('new-task-assignee').value) data.assigned_to_id = parseInt(document.getElementById('new-task-assignee').value, 10);
            await api.createTask(data);
            taskModal.classList.add('hidden');
            currentTaskPage = 1;
            loadProjectWorkspace(currentProjectId); 
        } catch (error) { alert("Task creation failed."); } 
        finally { btn.disabled = false; }
    });

    // INVITE MEMBER
    document.getElementById('btn-invite-member')?.addEventListener('click', async () => {
        if (!currentProjectId) return alert("No project loaded.");
        inviteModal.classList.remove('hidden');
        const list = document.getElementById('invite-members-list');
        try {
            const data = await api.getAllUsers();
            const users = Array.isArray(data) ? data : (data.results || []);
            const currentMemberIds = currentProjectDetails.team_members.map(m => m.id);
            list.innerHTML = '';
            users.forEach(user => {
                const checked = currentMemberIds.includes(user.id) ? 'checked' : '';
                list.innerHTML += `<label class="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1 rounded"><input type="checkbox" value="${user.id}" ${checked} class="w-4 h-4 text-gray-900 rounded"><span class="text-sm text-gray-700">${user.username}</span></label>`;
            });
        } catch (error) { console.error(error); }
    });

    document.getElementById('invite-member-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const ids = Array.from(document.getElementById('invite-members-list').querySelectorAll('input:checked')).map(cb => parseInt(cb.value, 10));
            await api.updateProject(currentProjectId, { team_member_ids: ids });
            inviteModal.classList.add('hidden');
            loadProjectWorkspace(currentProjectId);
        } catch (error) { alert("Failed to update team."); }
    });

    // DELETE PROJECT
    document.getElementById('btn-delete-project')?.addEventListener('click', async (e) => {
        if (!currentProjectId || !confirm("Delete project permanently?")) return;
        e.target.disabled = true;
        try {
            await api.deleteProject(currentProjectId);
            const data = await api.getProjects();
            renderSidebarProjects(data.results);
            if (data.results.length > 0) loadProjectWorkspace(data.results[0].id);
            else { document.getElementById('project-title').textContent = "No Projects"; document.getElementById('workspace-views').innerHTML = ''; }
        } catch (error) { alert("Failed to delete project."); } 
        finally { e.target.disabled = false; }
    });

    // --- GLOBAL DELEGATED CLICKS ---
    document.addEventListener('click', async (e) => {
        // Close Dropdowns if clicking outside
        if (filtersDropdown && !filtersDropdown.contains(e.target) && !document.getElementById('btn-task-filters')?.contains(e.target)) filtersDropdown.classList.add('hidden');
        if (userDropdown && !userDropdown.contains(e.target) && !btnUserMenu?.contains(e.target)) userDropdown.classList.add('hidden');

        // 0. Submit Comment
        const commentBtn = e.target.closest('[data-action="submit-comment"]');
        if (commentBtn) {
            e.preventDefault();
            const input = document.getElementById('new-comment-input');
            const text = input ? input.value.trim() : '';
            
            if (!text || !currentTaskId) return;

            commentBtn.disabled = true;
            commentBtn.textContent = "Posting...";
            try {
                await api.addTaskComment(currentTaskId, text);
                input.value = ''; 
                const updatedComments = await api.getTaskComments(currentTaskId);
                renderComments(updatedComments);
            } catch (error) {
                console.error("Failed to post comment:", error);
                alert("Failed to post comment. Check console.");
            } finally {
                commentBtn.disabled = false;
                commentBtn.textContent = "Comment";
            }
            return;
        }

        // 1. Open New Task Modal via '+' button
        const openModalBtn = e.target.closest('[data-action="open-new-task-modal"]');
        if (openModalBtn) {
            if (!currentProjectId) return alert("Select a project first.");
            document.getElementById('new-task-status').value = openModalBtn.dataset.status;
            taskModal.classList.remove('hidden');
            return;
        }

        // 2. Remove Team Member
        const removeMemberBtn = e.target.closest('[data-action="remove-member"]');
        if (removeMemberBtn && confirm("Remove this member?")) {
            try {
                const idToRemove = parseInt(removeMemberBtn.dataset.memberId, 10);
                
                // --- NEW LOGIC: Call the dedicated endpoint ---
                await api.removeTeamMember(currentProjectId, idToRemove);
                
                // Refresh the workspace to reflect the cleanup
                loadProjectWorkspace(currentProjectId);
            } catch (error) { 
                console.error("Remove Member Error:", error);
                alert("Failed to remove member. Check console."); 
            }
            return;
        }


        // --- COMPLETE TASK BUTTON ---
        // Changed to match the HTML data-action attribute!
        const completeBtn = e.target.closest('[data-action="toggle-complete"]');
        if (completeBtn) {
            e.stopPropagation(); // Stop the row from opening the side panel
            const taskId = completeBtn.closest('.task-row').dataset.taskId;
            
            try {
                // Optimistic UI update
                completeBtn.classList.add('bg-green-500', 'text-white', 'border-green-500');
                
                // Tell Django it's done
                await api.updateTask(taskId, { status: 'DONE' });
                
                // Refresh to move it to the archive
                loadProjectWorkspace(currentProjectId);
            } catch (error) {
                console.error("Failed to complete task:", error);
                completeBtn.classList.remove('bg-green-500', 'text-white', 'border-green-500'); // Revert on failure
                alert("Failed to mark task as done.");
            }
            return;
        }

        // 3. Delete Task
        const deleteTaskBtn = e.target.closest('[data-action="delete-task"]');
        if (deleteTaskBtn && confirm("Permanently delete task?")) {
            try {
                await api.deleteTask(deleteTaskBtn.closest('.task-row').dataset.taskId);
                loadProjectWorkspace(currentProjectId);
            } catch (error) { alert("Failed to delete task."); }
            return;
        }

        // 4. Open Task Panel (List View)
        const taskRow = e.target.closest('.task-row');
        if (taskRow && !e.target.closest('[data-action="toggle-complete"]') && !deleteTaskBtn) {
            currentTaskId = taskRow.dataset.taskId;
            await openTaskPanel(currentTaskId);
            return;
        }

        // 5. Pagination
        const pageBtn = e.target.closest('button[data-page]');
        if (pageBtn && currentProjectId && !pageBtn.disabled) {
            const action = pageBtn.dataset.page;
            if (action === 'prev') currentTaskPage = Math.max(1, currentTaskPage - 1);
            else if (action === 'next') currentTaskPage++;
            else currentTaskPage = parseInt(action, 10);
            loadProjectWorkspace(currentProjectId);
            return;
        }

        // 6. Click a Spotlight Search Result
        const spotlightItem = e.target.closest('.spotlight-item');
        if (spotlightItem) {
            const type = spotlightItem.dataset.type;
            const id = parseInt(spotlightItem.dataset.id, 10);
            
            document.getElementById('spotlight-dropdown').classList.add('hidden');
            document.getElementById('global-search').value = '';
            
            if (type === 'project') {
                currentTaskPage = 1;
                loadProjectWorkspace(id);
            } else if (type === 'task') {
                const projectId = parseInt(spotlightItem.dataset.projectId, 10);
                if (projectId && projectId !== currentProjectId) {
                    currentTaskPage = 1;
                    await loadProjectWorkspace(projectId); 
                } else if (!currentProjectId) {
                    closeAllPanels(); // Replaced the broken switchGlobalView
                }
                currentTaskId = id;
                await openTaskPanel(id);
            }
            return;
        }

        // 7. Close Side Panels
        if (e.target.closest('[data-action="close-side-panel"]') || e.target.id === 'panel-overlay') {
            closeAllPanels();
            return;
        }
    });

    // --- KANBAN DRAG & DROP ZONES (STRICT TRANSITIONS) ---
    const kanbanColumns = document.querySelectorAll('.kanban-column');
    
    kanbanColumns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            if (!draggedTaskStatus) return; 
            
            const targetStatus = column.dataset.status;
            const allowed = ALLOWED_TRANSITIONS[draggedTaskStatus] || [];
            
            // ONLY prevent default (which allows dropping) if the transition is legal
            if (targetStatus === draggedTaskStatus || allowed.includes(targetStatus)) {
                e.preventDefault(); 
                column.parentElement.classList.add('bg-gray-200'); 
            }
        });

        column.addEventListener('dragleave', (e) => {
            column.parentElement.classList.remove('bg-gray-200');
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.parentElement.classList.remove('bg-gray-200');
            
            const newStatus = column.dataset.status;
            const allowed = ALLOWED_TRANSITIONS[draggedTaskStatus] || [];
            
            // Double check validation before hitting the API
            if (newStatus !== draggedTaskStatus && allowed.includes(newStatus) && draggedTaskId) {
                try {
                    await api.updateTask(draggedTaskId, { status: newStatus });
                    loadProjectWorkspace(currentProjectId);
                } catch (error) {
                    console.error("Failed to move task:", error);
                    alert("Failed to move task. Check console.");
                }
            }
        });
    });

    
});