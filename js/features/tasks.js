import { DatabaseService } from '../databaseservice.js';

export class TaskManager {
    constructor(dbService) {
        if (!dbService) {
            throw new Error('Database service is required');
        }
        this.db = dbService;
        this.tasks = [];
        this.taskList = document.getElementById('taskList');
        this.currentTaskDisplay = document.getElementById('currentTask');
        this.currentTask = null;
        this.initialize();
    }

    async initialize() {
        try {
            await this.setupEventListeners();
            await this.loadTasks();
        } catch (error) {
            console.error('Failed to initialize TaskManager:', error);
        }
    }    setupEventListeners() {
        const addButton = document.getElementById('addTask');
        const taskInput = document.getElementById('taskInput');
        const taskList = document.getElementById('taskList');

        addButton?.addEventListener('click', () => this.addTask());
        
        taskInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Add click event listener for task selection
        taskList?.addEventListener('click', (e) => {
            const taskItem = e.target.closest('li');
            if (taskItem) {
                const taskId = taskItem.dataset.id;
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    // Remove selection from other tasks
                    taskList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
                    // Add selection to clicked task
                    taskItem.classList.add('selected');
                    this.setCurrentTask(task);
                }
            }
        });
    }

    async loadTasks() {
        try {
            this.tasks = await this.db.getTasks() || [];
            this.renderTasks();
            // Automatically select the first task if any exist
            if (this.tasks.length > 0) {
                this.setCurrentTask(this.tasks[0]);
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }    async addTask() {
        const taskInput = document.getElementById('taskInput');
        const taskText = taskInput?.value.trim();
        
        if (!taskText) return;
        
        try {
            const newTask = {
                id: 'task-' + Date.now(),
                text: taskText,
                name: taskText, // Assuming name is same as text for now
                completed: false,
                createdAt: new Date().toISOString(),
                duration: 0,
                selected: true // Mark as selected when added
            };
            
            // Save to Firebase via DatabaseService
            if (this.db.useFirebase && this.db.firebase?.saveTask) {
                 await this.db.firebase.saveTask(newTask);
                 console.log('Task saved to Firebase');
            } else {
                 // Fallback to local storage if Firebase is not used or saveTask method is missing
                 await this.db.saveTasks([...this.tasks, newTask]);
                 console.log('Task saved locally');
            }

            this.tasks.push(newTask);
            this.renderTasks();
            
            // Automatically select the newly created task
            this.setCurrentTask(newTask);
            
            // Clear input
            if (taskInput) {
                taskInput.value = '';
            }
        } catch (error) {
            console.error('Failed to add task:', error);
        }
    }

    async toggleTask(taskId) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                await this.db.saveTasks(this.tasks);
                this.renderTasks();
            }
        } catch (error) {
            console.error('Failed to toggle task:', error);
        }
    }

    async deleteTask(taskId) {
        try {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            await this.db.saveTasks(this.tasks);
            this.renderTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    }

    async completeCurrentTask() {
        if (!this.currentTask) return;
        
        try {
            // Mark task as completed
            this.currentTask.completed = true;
            this.currentTask.completedAt = new Date().toISOString();
            
            // Save to database
            await this.db.saveTasks(this.tasks);
            
            // Clear current task
            const completedTask = this.currentTask;
            this.currentTask = null;
            this.currentTaskDisplay.textContent = 'No task selected';

            // Reset timer UI and controls
            document.getElementById('startBtn').disabled = true;
            document.getElementById('startBtn').textContent = 'Start Focus';
            document.getElementById('pauseBtn').disabled = true;
            document.getElementById('resetBtn').disabled = true;
            document.getElementById('completeBtn').disabled = true;
            document.getElementById('customTime').disabled = true;

            // Reset timer display to default
            const timerDisplay = document.getElementById('timer');
            if (timerDisplay) {
                const defaultMinutes = document.getElementById('customTime')?.value || '25';
                timerDisplay.textContent = `${defaultMinutes.padStart(2, '0')}:00`;
            }
            
            // Re-render task list
            this.renderTasks();
            
            return completedTask;
        } catch (error) {
            console.error('Failed to complete task:', error);
            return null;
        }
    }

    renderTasks() {
        if (!this.taskList) return;
        
        this.taskList.innerHTML = '';
        
        if (this.tasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'task-empty';
            emptyMessage.textContent = 'No tasks added yet';
            this.taskList.appendChild(emptyMessage);
            return;
        }

        this.tasks
            .filter(task => !task.completed) // Only show uncompleted tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .forEach(task => {
                const li = document.createElement('li');
                li.className = 'task-item';
                li.dataset.id = task.id;
                
                if (this.currentTask && this.currentTask.id === task.id) {
                    li.classList.add('selected');
                }
                
                const taskContent = document.createElement('div');
                taskContent.className = 'task-content';
                
                const taskText = document.createElement('span');
                taskText.className = 'task-text';
                taskText.textContent = task.text;
                
                const selectBtn = document.createElement('button');
                selectBtn.className = 'select-task-btn';
                selectBtn.textContent = 'Select';
                selectBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.setCurrentTask(task);
                };
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-task-btn';
                deleteBtn.textContent = '✖';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this task?')) {
                        this.deleteTask(task.id);
                    }
                };
                
                taskContent.appendChild(taskText);
                li.appendChild(taskContent);
                li.appendChild(selectBtn);
                li.appendChild(deleteBtn);
                
                this.taskList.appendChild(li);
            });
    }    setCurrentTask(task) {
        if (!task) {
            this.currentTask = null;
            console.log('Task deselected. currentTask:', this.currentTask);
            if (this.currentTaskDisplay) {
                this.currentTaskDisplay.textContent = 'No task selected';
                this.currentTaskDisplay.classList.remove('current-task-active');
                this.currentTaskDisplay.classList.add('current-task-empty');
            }
            // Disable timer controls if no task is selected
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = true;
            document.getElementById('resetBtn').disabled = true;
            document.getElementById('completeBtn').disabled = true;
            document.getElementById('customTime').disabled = true;
            return null;
        }
        
        this.currentTask = task;
        
        // Update current task display
        if (this.currentTaskDisplay) {
            this.currentTaskDisplay.textContent = task.text || task.name;
            this.currentTaskDisplay.classList.add('current-task-active');
            this.currentTaskDisplay.classList.remove('current-task-empty');
        }
        
        // Update task list selection
        if (this.taskList) {
            // Remove selection from all tasks
            this.taskList.querySelectorAll('li').forEach(li => {
                li.classList.remove('selected');
            });
            
            // Add selection to the current task
            const taskElement = this.taskList.querySelector(`li[data-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.add('selected');
                // Scroll task into view if needed
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        
        // Enable timer controls when a task is selected
        document.getElementById('startBtn').disabled = false;
        document.getElementById('customTime').disabled = false;
        // Keep other buttons disabled until timer starts
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resetBtn').disabled = true;
        document.getElementById('completeBtn').disabled = true;

        console.log('Task selected:', this.currentTask);
        return task;
    }
}