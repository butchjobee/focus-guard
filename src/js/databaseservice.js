import { FirebaseService } from './services/firebaseService.js';

export class DatabaseService {    constructor(app) {
        this.dbName = 'focusGuardDB';
        this.dbVersion = 2;
        this.firebase = new FirebaseService();
        this.useFirebase = false; // Default to local storage
        this.initialized = false;
    }

    async migrateFromLocalStorage() {
        try {
            // Migrate statistics
            const stats = localStorage.getItem('statistics');
            if (stats) {
                await this.saveStats(JSON.parse(stats));
                localStorage.removeItem('statistics');
            }

            // Migrate tasks
            const tasks = localStorage.getItem('tasks');
            if (tasks) {
                await this.saveTasks(JSON.parse(tasks));
                localStorage.removeItem('tasks');
            }

            // Migrate settings
            const settings = localStorage.getItem('settings');
            if (settings) {
                await this.saveSettings(JSON.parse(settings));
                localStorage.removeItem('settings');
            }

            console.log('Migration from localStorage completed');
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }    async init() {
        try {
            // First initialize local database as fallback
            await this.initDatabase();
            
            // Then try Firebase initialization
            try {
                const firebaseInitialized = await this.firebase.init();
                if (firebaseInitialized) {
                    console.log('Firebase initialized successfully');
                    this.useFirebase = true;
                } else {
                    console.log('Using local storage mode');
                    this.useFirebase = false;
                }
            } catch (firebaseError) {
                console.warn('Firebase initialization failed, using local storage only:', firebaseError);
                this.useFirebase = false;
            }

            // Migrate any existing data
            await this.migrateFromLocalStorage();
            return true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create logs store with timestamp index
                if (!db.objectStoreNames.contains('logs')) {
                    const logsStore = db.createObjectStore('logs', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    logsStore.createIndex('timestamp', 'timestamp');
                    logsStore.createIndex('type', 'type');
                }
                
                // Create stores with indexes
                if (!db.objectStoreNames.contains('statistics')) {
                    const statsStore = db.createObjectStore('statistics', { keyPath: 'id' });
                    statsStore.createIndex('date', 'lastSessionDate');
                }
                if (!db.objectStoreNames.contains('tasks')) {
                    const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    tasksStore.createIndex('completed', 'completed');
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('completedTasks')) {
                    db.createObjectStore('completedTasks', { keyPath: 'id' });
                }
            };
        });
    }

    async saveStats(stats) {
        const transaction = this.db.transaction(['statistics'], 'readwrite');
        const store = transaction.objectStore('statistics');
        return store.put({ id: 'focusStats', ...stats });
    }

    async getStats() {
        const transaction = this.db.transaction(['statistics'], 'readonly');
        const store = transaction.objectStore('statistics');
        return new Promise((resolve, reject) => {
            const request = store.get('focusStats');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || {
                totalSessions: 0,
                totalFocusTime: 0,
                completedTasks: 0,
                totalTasks: 0,
                lastSessionDate: null,
                sessionHistory: [],
                statusHistory: []
            });
        });
    }

    async saveTasks(tasks) {
        const transaction = this.db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        return store.put({ id: 'focusTasks', tasks });
    }    async getTasks() {
        if (!this.initialized) {
            await this.init();
        }

        if (this.useFirebase && this.firebase.isInitialized) {
            try {
                const tasks = await this.firebase.getTasks();
                return tasks;
            } catch (error) {
                console.warn('Failed to get tasks from Firebase, falling back to local storage:', error);
                this.useFirebase = false; // Switch to local storage mode
            }
        }

        // Fallback to IndexedDB
        if (this.db) {
            try {
                const transaction = this.db.transaction(['tasks'], 'readonly');
                const store = transaction.objectStore('tasks');
                return new Promise((resolve, reject) => {
                    const request = store.get('focusTasks');
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result?.tasks || []);
                });
            } catch (error) {
                console.error('Error getting tasks from IndexedDB:', error);
                return [];
            }
        }

        return []; // Return empty array if nothing else works
    }async saveSettings(settings) {
        // Save to local IndexedDB
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        await store.put({ id: 'focusSettings', ...settings });

        // If Firebase is available, save there too
        if (this.useFirebase) {
            try {
                await this.firebase.saveSettings(settings);
            } catch (error) {
                console.warn('Failed to save settings to Firebase:', error);
                // Continue since we already saved to IndexedDB
            }
        }
        
        return settings;
    }    async getSettings() {
        try {
            // Try Firebase first if available
            if (this.useFirebase) {
                try {
                    const firebaseSettings = await this.firebase.getSettings();
                    if (firebaseSettings) {
                        return firebaseSettings;
                    }
                } catch (error) {
                    console.warn('Failed to get settings from Firebase:', error);
                }
            }

            // Fall back to IndexedDB
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            return new Promise((resolve, reject) => {
                const request = store.get('focusSettings');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result || {
                    focusDuration: 25,
                    enableNotifications: true,
                    soundEnabled: true,
                    theme: 'light'
                });
            });
        } catch (error) {
            console.error('Failed to get settings:', error);
            // Return defaults if all else fails
            return {
                focusDuration: 25,
                enableNotifications: true,
                soundEnabled: true,
                theme: 'light'
            };
        }
    }

    // Add new methods for logging
    async logEvent(type, data) {
        const transaction = this.db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const logEntry = {
            type,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        await store.add(logEntry);
    }

    async getLogs(filter = {}) {
        const transaction = this.db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                let logs = request.result;
                if (filter.type) {
                    logs = logs.filter(log => log.type === filter.type);
                }
                if (filter.startDate) {
                    logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.startDate));
                }
                if (filter.endDate) {
                    logs = logs.filter(log => new Date(log.timestamp) <= new Date(filter.endDate));
                }
                resolve(logs);
            };
        });
    }

    async saveCompletedTask(taskData) {
        if (this.useFirebase && this.firebase.isInitialized) {
            try {
                await this.firebase.saveCompletedTask(taskData);
                return;
            } catch (error) {
                console.warn('Failed to save completed task to Firebase:', error);
            }
        }

        // Fallback to IndexedDB
        try {
            const transaction = this.db.transaction(['completedTasks'], 'readwrite');
            const store = transaction.objectStore('completedTasks');
            const tasks = (await this.getCompletedTasks()) || [];
            tasks.push(taskData);
            await store.put({ tasks }, 'completedTasks');
        } catch (error) {
            console.error('Failed to save completed task to IndexedDB:', error);
            throw error;
        }
    }

    async getCompletedTasks() {
        if (this.useFirebase && this.firebase.isInitialized) {
            try {
                const tasks = await this.firebase.getCompletedTasks();
                return tasks;
            } catch (error) {
                console.warn('Failed to get completed tasks from Firebase:', error);
            }
        }

        // Fallback to IndexedDB
        try {
            const transaction = this.db.transaction(['completedTasks'], 'readonly');
            const store = transaction.objectStore('completedTasks');
            return new Promise((resolve, reject) => {
                const request = store.get('completedTasks');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result?.tasks || []);
            });
        } catch (error) {
            console.error('Failed to get completed tasks from IndexedDB:', error);
            return [];
        }
    }
}