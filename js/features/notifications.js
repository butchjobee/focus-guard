export class NotificationManager {
    constructor() {
        this.init();
        // Pre-load the audio
        this.audio = new Audio('../assets/notification.mp3');
        this.audio.load();
    }

    async init() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.enabled = permission === 'granted';
        }
    }

    async playNotificationSound() {
        try {
            // Reset the audio to the beginning
            this.audio.currentTime = 0;
            await this.audio.play();
        } catch (error) {
            console.error('Failed to play notification sound:', error);
        }
    }

    notify(title, options = {}) {
        console.log('Notification triggered with sound:', options.sound);
        if (this.enabled) {
            const notification = new Notification(title, {
                icon: '../assets/icon.png',
                ...options
            });

            if (options.sound) {
                this.playNotificationSound();
            }
        }
    }
}