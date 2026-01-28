import { db, auth } from '../firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where,
    getDoc,
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

export class FirebaseService {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.userId = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Persist userId in localStorage so it is consistent across sessions
            let storedUserId = localStorage.getItem('focusGuardUserId');
            if (!storedUserId) {
                storedUserId = 'local-' + Date.now();
                localStorage.setItem('focusGuardUserId', storedUserId);
            }
            this.userId = storedUserId;
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            this.isInitialized = false;
            return false;
        }
    }

    // Focus Sessions
    async saveFocusSession(sessionData) {
        if (!this.isInitialized) return null;
        
        try {
            const sessionsRef = collection(this.db, 'focusSessions');
            const docRef = await addDoc(sessionsRef, {
                ...sessionData,
                userId: this.userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error saving focus session:", error);
            return null;
        }
    }

    async getFocusSessions() {
        if (!this.isInitialized) return [];
        
        try {
            const sessionsRef = collection(this.db, 'focusSessions');
            const q = query(sessionsRef, where("userId", "==", this.userId));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting focus sessions:", error);
            return [];
        }
    }

    // Tasks
    async getTasks() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            const tasksCollection = collection(this.db, 'tasks');
            const q = query(tasksCollection, where("userId", "==", this.userId));
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting tasks:', error);
            throw error;
        }
    }

    async saveTasks(tasks) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            const tasksCollection = collection(this.db, 'tasks');
            // Delete existing tasks for this user
            const q = query(tasksCollection, where("userId", "==", this.userId));
            const querySnapshot = await getDocs(q);
            
            for (const doc of querySnapshot.docs) {
                await deleteDoc(doc.ref);
            }

            // Add new tasks
            for (const task of tasks) {
                await addDoc(tasksCollection, {
                    ...task,
                    userId: this.userId,
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error saving tasks:', error);
            throw error;
        }
    }

    // Completed Tasks
    async saveCompletedTask(taskData) {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            console.log('Saving to completedTasks collection:', taskData);
            const completedTasksCollection = collection(this.db, 'completedTasks');
            
            const docRef = await addDoc(completedTasksCollection, {
                ...taskData,
                userId: this.userId,
                completed: true,
                completedAt: new Date().toISOString()
            });
            
            console.log('Successfully saved completed task with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error saving completed task:', error);
            throw error;
        }
    }

    async getCompletedTasks() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            console.log('Fetching from completedTasks collection...');
            const completedTasksCollection = collection(this.db, 'completedTasks');
            const q = query(
                completedTasksCollection,
                where("userId", "==", this.userId)
            );
            
            const querySnapshot = await getDocs(q);
            console.log('Found completed tasks:', querySnapshot.size);
            
            const tasks = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return tasks.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        } catch (error) {
            console.error('Error getting completed tasks:', error);
            throw error;
        }
    }

    // Settings
    async saveSettings(settings) {
        if (!this.isInitialized) return null;
        
        try {
            const settingsRef = doc(this.db, 'settings', this.userId);
            await setDoc(settingsRef, {
                ...settings,
                userId: this.userId,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return this.userId;
        } catch (error) {
            console.error("Error saving settings:", error);
            return null;
        }
    }

    async getSettings() {
        if (!this.isInitialized) return null;
        
        try {
            const settingsRef = doc(this.db, 'settings', this.userId);
            const docSnap = await getDoc(settingsRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            }
            
            // If no settings exist yet, create default settings
            const defaultSettings = {
                focusDuration: 25,
                enableNotifications: true,
                soundEnabled: true,
                theme: 'light'
            };
            
            await this.saveSettings(defaultSettings);
            return defaultSettings;
        } catch (error) {
            console.error("Error getting settings:", error);
            return null;
        }
    }

    // Statistics
    async saveStatistics(stats) {
        if (!this.isInitialized) return null;
        
        try {
            const statsRef = doc(this.db, 'statistics', this.userId);
            await setDoc(statsRef, {
                ...stats,
                userId: this.userId,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return this.userId;
        } catch (error) {
            console.error('Error saving statistics:', error);
            return null;
        }
    }

    async getStatistics() {
        if (!this.isInitialized) return null;
        
        try {
            const statsRef = doc(this.db, 'statistics', this.userId);
            const docSnap = await getDoc(statsRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            }
            
            const defaultStats = {
                totalSessions: 0,
                totalFocusTime: 0,
                completedSessions: 0,
                lastSessionDate: null
            };
            
            await this.saveStatistics(defaultStats);
            return defaultStats;
        } catch (error) {
            console.error("Error getting statistics:", error);
            return null;
        }
    }
}
