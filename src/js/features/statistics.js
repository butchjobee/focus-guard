export class StatisticsManager {
    constructor(dbService) {
        this.db = dbService;
        this.stats = null;
    }

    async loadStatistics() {
        try {
            this.stats = await this.db.getStatistics() || this.getDefaultStats();
            this.renderStats();
        } catch (error) {
            console.error('Failed to load statistics:', error);
            this.stats = this.getDefaultStats();
            this.renderStats();
        }
    }

    getDefaultStats() {
        return {
            totalSessions: 0,
            totalFocusTime: 0,
            completedSessions: 0,
            averageSessionTime: 0,
            lastSessionDate: null,
            weeklyStats: [],
            monthlyStats: []
        };
    }

    async updateStatistics(sessionData) {
        try {
            const stats = this.stats || await this.db.getStatistics() || this.getDefaultStats();
            
            // Update counts
            stats.totalSessions++;
            stats.totalFocusTime += sessionData.duration;
            if (sessionData.completed) {
                stats.completedSessions++;
            }
            
            // Calculate average
            stats.averageSessionTime = Math.round(stats.totalFocusTime / stats.totalSessions);
            stats.lastSessionDate = new Date().toISOString();
            
            // Update periodic stats
            this.updatePeriodicStats(stats, sessionData);
            
            // Save to database
            await this.db.saveStatistics(stats);
            this.stats = stats;
            
            // Update display if we're on the statistics page
            this.renderStats();
        } catch (error) {
            console.error('Failed to update statistics:', error);
        }
    }

    updatePeriodicStats(stats, sessionData) {
        const now = new Date();
        const week = this.getWeekNumber(now);
        const month = now.getMonth();
        
        // Update weekly stats
        if (!stats.weeklyStats) stats.weeklyStats = [];
        let weekStat = stats.weeklyStats.find(s => s.week === week);
        if (!weekStat) {
            weekStat = { week, sessions: 0, focusTime: 0, completed: 0 };
            stats.weeklyStats.push(weekStat);
        }
        weekStat.sessions++;
        weekStat.focusTime += sessionData.duration;
        if (sessionData.completed) weekStat.completed++;
        
        // Update monthly stats
        if (!stats.monthlyStats) stats.monthlyStats = [];
        let monthStat = stats.monthlyStats.find(s => s.month === month);
        if (!monthStat) {
            monthStat = { month, sessions: 0, focusTime: 0, completed: 0 };
            stats.monthlyStats.push(monthStat);
        }
        monthStat.sessions++;
        monthStat.focusTime += sessionData.duration;
        if (sessionData.completed) monthStat.completed++;
        
        // Keep only last 12 months and 52 weeks
        stats.weeklyStats = stats.weeklyStats.slice(-52);
        stats.monthlyStats = stats.monthlyStats.slice(-12);
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    renderStats() {
        const statsContainer = document.getElementById('statisticsContainer');
        if (!statsContainer || !this.stats) return;
        
        const template = `
            <div class="stats-overview">
                <div class="stat-card">
                    <h3>Total Sessions</h3>
                    <p>${this.stats.totalSessions}</p>
                </div>
                <div class="stat-card">
                    <h3>Completed Sessions</h3>
                    <p>${this.stats.completedSessions}</p>
                </div>
                <div class="stat-card">
                    <h3>Total Focus Time</h3>
                    <p>${Math.round(this.stats.totalFocusTime / 60)} hours</p>
                </div>
                <div class="stat-card">
                    <h3>Average Session</h3>
                    <p>${this.stats.averageSessionTime} minutes</p>
                </div>
            </div>
            ${this.renderChart()}
        `;
        
        statsContainer.innerHTML = template;
    }

    renderChart() {
        if (!this.stats.weeklyStats?.length) return '';
        
        const weeklyData = this.stats.weeklyStats.slice(-4);
        const maxValue = Math.max(...weeklyData.map(w => w.focusTime));
        
        const bars = weeklyData.map(week => {
            const height = (week.focusTime / maxValue) * 100;
            return `
                <div class="chart-bar" style="height: ${height}%">
                    <div class="bar-label">${Math.round(week.focusTime / 60)}h</div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="stats-chart">
                <h3>Weekly Focus Time</h3>
                <div class="chart-container">
                    ${bars}
                </div>
            </div>
        `;
    }
}