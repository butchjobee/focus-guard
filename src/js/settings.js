import { DatabaseService } from './services/databaseservice.js';

export class SettingsManager {
    constructor() {
        this.db = new DatabaseService();
        this.init();
        this.defaultSettings = {
            focusDuration: 25,
            enableNotifications: true,
            soundEnabled: true,
            theme: 'light'
        };
    }

    async init() {
        try {
            await this.db.init();
            await this.loadSettings();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing settings:', error);
            this.handleError(error);
        }
    }

    async loadSettings() {
        try {
            const settings = await this.db.getSettings() || this.defaultSettings;
            this.updateUIWithSettings(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.handleError(error);
            // Fall back to default settings if there's an error
            this.updateUIWithSettings(this.defaultSettings);
        }
    }

    updateUIWithSettings(settings) {
        const elements = {
            'focusDuration': settings.focusDuration,
            'enableNotifications': settings.enableNotifications,
            'soundEnabled': settings.soundEnabled
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                if (typeof value === 'boolean') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        }
    }

    async saveSettings() {
        try {
            const settings = this.gatherSettingsFromUI();
            if (!this.validateSettings(settings)) {
                return;
            }

            await this.db.saveSettings(settings);
            this.showSuccessMessage('Settings saved successfully!');
            setTimeout(() => {
                window.location.href = 'focus-session.html';
            }, 1500);
        } catch (error) {
            console.error('Error saving settings:', error);
            this.handleError(error);
        }
    }

    gatherSettingsFromUI() {
        return {
            focusDuration: parseInt(document.getElementById('focusDuration').value),
            enableNotifications: document.getElementById('enableNotifications').checked,
            soundEnabled: document.getElementById('soundEnabled').checked,
            theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
            lastUpdated: new Date().toISOString()
        };
    }

    validateSettings(settings) {
        if (isNaN(settings.focusDuration) || settings.focusDuration < 1 || settings.focusDuration > 120) {
            this.showError('Please enter a valid duration between 1 and 120 minutes');
            return false;
        }
        return true;
    }

    setupEventListeners() {
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveSettings());
        }
    }

    handleError(error) {
        let message = 'An error occurred while managing settings. ';
        if (error.code === 'permission-denied') {
            message += 'You don\'t have permission to access these settings.';
        } else if (error.code === 'not-found') {
            message += 'Settings not found. Using defaults.';
        } else if (error.code === 'network-error') {
            message += 'Network error. Changes will be saved locally.';
        }
        this.showError(message);
    }

    showError(message) {
        // You might want to create a more sophisticated error display
        alert(message);
    }

    showSuccessMessage(message) {
        // You might want to create a more sophisticated success message display
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});