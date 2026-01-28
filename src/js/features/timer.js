export class TimerManager {
    constructor(duration = 25, timerDisplay, taskManager = null) {
        this.timeInMinutes = duration;
        this.timeLeft = this.timeInMinutes * 60;
        this.isRunning = false;
        this.timerId = null;
        this.timerDisplay = timerDisplay;
        this.taskManager = taskManager;
        this.startTime = null;
        this.updateDisplay();
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = new Date();
            this.timerId = setInterval(() => this.tick(), 1000);
        }
    }

    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timerId);
        }
    }

    reset() {
        this.pause();
        this.timeLeft = this.timeInMinutes * 60;
        this.updateDisplay();
    }

    tick() {
        if (this.timeLeft <= 0) {
            this.complete();
            return;
        }
        this.timeLeft--;
        this.updateDisplay();
    }

    complete() {
        this.pause();
        
        // Calculate actual duration
        const endTime = new Date();
        const actualDuration = this.startTime ? 
            Math.round((endTime - this.startTime) / 1000 / 60) : // Convert to minutes
            this.timeInMinutes;

        // Save completed task if we have a task manager
        if (this.taskManager) {
            this.taskManager.completeTask(actualDuration);
        }

        if (this.onComplete) {
            this.onComplete();
        }
    }

    updateDisplay() {
        if (!this.timerDisplay) return;
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress circle if it exists
        const progressCircle = document.querySelector('.progress-circle');
        if (progressCircle) {
            const progress = (this.timeLeft / (this.timeInMinutes * 60)) * 100;
            progressCircle.style.background = `conic-gradient(
                var(--primary-color) ${progress}%,
                var(--background-color) ${progress}%
            )`;
        }
    }

    getTimeLeft() {
        return {
            minutes: Math.floor(this.timeLeft / 60),
            seconds: this.timeLeft % 60,
            total: this.timeLeft
        };
    }

    setOnComplete(callback) {
        this.onComplete = callback;
    }

    setTaskManager(taskManager) {
        this.taskManager = taskManager;
    }
}

// Timer initialization and controls
document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const timeButtons = document.querySelectorAll('.time-btn');
    
    // Load settings from localStorage or use default
    const settings = JSON.parse(localStorage.getItem('focusSettings')) || { focusDuration: 25 };
    let timerManager = new TimerManager(settings.focusDuration, timerDisplay);
    
    // Button event listeners
    startBtn.addEventListener('click', () => {
        timerManager.start();
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        resetBtn.disabled = false;
        timeButtons.forEach(btn => btn.disabled = true);
    });
    
    pauseBtn.addEventListener('click', () => {
        timerManager.pause();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.textContent = 'Resume';
    });
    
    resetBtn.addEventListener('click', () => {
        timerManager.reset();
        startBtn.disabled = false;
        startBtn.textContent = 'Start Focus';
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
        timeButtons.forEach(btn => btn.disabled = false);
    });
    
    // Time selection buttons
    timeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const minutes = parseInt(e.target.dataset.time);
            timerManager.setTime(minutes);
            timeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Set initial active state if time buttons exist
    if (timeButtons.length > 0) {
        timeButtons[0].classList.add('active');
    }
    
    // Handle timer completion
    timerManager.setOnComplete(() => {
        // Play notification sound
        const audio = new Audio('../assets/notification.mp3');
        audio.play();
        
        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
            new Notification('Focus Session Complete!', {
                body: 'Great job! Take a break.',
                icon: '../assets/favicon.ico'
            });
        }
        
        // Reset timer
        timerManager.reset();
        startBtn.disabled = false;
        startBtn.textContent = 'Start Focus';
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
        timeButtons.forEach(btn => btn.disabled = false);
    });
});

// Request notification permission
if (Notification.permission !== 'denied') {
    Notification.requestPermission();
}