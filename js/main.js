import { app } from './firebase.js';
import { DatabaseService } from './databaseservice.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase Database
    const db = new DatabaseService(app);
    await db.init();

    // Core navigation functions
    window.startFocusSession = () => {
        window.location.href = 'focus-session.html';
    };

    window.viewStatistics = () => {
        window.location.href = 'statistics.html';
    };

    window.openSettings = () => {
        window.location.href = 'settings.html';
    };

    // Timer class and functionality
    class Timer {
        constructor(duration, display) {
            this.db = new DatabaseService(app);
            this.duration = duration * 60; // convert to seconds
            this.display = display;
            this.running = false;
            this.timerId = null;
            this.sessionId = null;
        }

        async start() {
            if (!this.running) {
                this.running = true;
                this.timerId = setInterval(() => {
                    this.tick();
                }, 1000);
                
                // Log session start in Firebase
                const sessionData = {
                    startTime: new Date().toISOString(),
                    duration: this.duration / 60, // Store in minutes
                    status: 'running'
                };
                
                try {
                    const session = await this.db.firebase.saveFocusSession(sessionData);
                    this.sessionId = session.id;
                } catch (error) {
                    console.error('Failed to save session start:', error);
                }
            }
        }

        async stop() {
            if (this.running) {
                this.running = false;
                clearInterval(this.timerId);
                
                // Log session pause in Firebase
                if (this.sessionId) {
                    try {
                        await this.db.firebase.updateFocusSession(this.sessionId, {
                            pauseTime: new Date().toISOString(),
                            timeLeft: this.duration,
                            status: 'paused'
                        });
                    } catch (error) {
                        console.error('Failed to save session pause:', error);
                    }
                }
            }
        }

        async tick() {
            if (this.duration <= 0) {
                await this.complete();
                return;
            }
            this.duration--;
            this.updateDisplay();
        }

        async complete() {
            this.stop();
            
            // Log session completion in Firebase
            if (this.sessionId) {
                try {
                    await this.db.firebase.updateFocusSession(this.sessionId, {
                        endTime: new Date().toISOString(),
                        status: 'completed'
                    });
                    
                    // Update statistics
                    await this.updateStatistics();
                    
                    alert('Focus session completed!');
                } catch (error) {
                    console.error('Failed to save session completion:', error);
                }
            }
        }
        
        updateDisplay() {
            const minutes = Math.floor(this.duration / 60);
            const seconds = this.duration % 60;
            this.display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        async updateStatistics() {
            try {
                const stats = await this.db.firebase.getStatistics();
                const updatedStats = {
                    totalSessions: (stats?.totalSessions || 0) + 1,
                    totalMinutes: (stats?.totalMinutes || 0) + (this.duration / 60),
                    lastSessionDate: new Date().toISOString()
                };
                await this.db.firebase.saveStatistics(updatedStats);
            } catch (error) {
                console.error('Failed to update statistics:', error);
            }
        }
    }

    // Initialize timer if on focus session page
    const timerDisplay = document.querySelector('.timer');
    if (timerDisplay) {
        const startButton = document.getElementById('startTimer');
        const stopButton = document.getElementById('stopFocus');
        let focusTimer = new Timer(25, timerDisplay);

        // Time selection buttons
        const timeButtons = document.querySelectorAll('.time-btn');
        timeButtons?.forEach(button => {
            button.addEventListener('click', () => {
                const minutes = parseInt(button.dataset.time) || 25;
                focusTimer = new Timer(minutes, timerDisplay);
                focusTimer.updateDisplay();
                
                timeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        startButton?.addEventListener('click', () => {
            if (!focusTimer.running) {
                focusTimer.start();
                startButton.textContent = 'Pause';
            } else {
                focusTimer.stop();
                startButton.textContent = 'Resume';
            }
        });

        stopButton?.addEventListener('click', () => {
            if (confirm('Are you sure you want to end this focus session?')) {
                focusTimer.stop();
                window.location.href = 'index.html';
            }
        });
    }

    // Theme initialization
    if (typeof ThemeManager !== 'undefined') {
        new ThemeManager();
    }

    // Add navigation for main page buttons
    const startFocusBtn = document.getElementById('startFocus');
    const settingsBtn = document.getElementById('settings');
    const statisticsBtn = document.getElementById('statistics');
    const helpBtn = document.getElementById('help');

    if (startFocusBtn) {
        startFocusBtn.addEventListener('click', () => {
            window.location.href = 'focus-session.html';
        });
    }
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }
    if (statisticsBtn) {
        statisticsBtn.addEventListener('click', () => {
            window.location.href = 'statistics.html';
        });
    }
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            window.location.href = 'help.html';
        });
    }
});