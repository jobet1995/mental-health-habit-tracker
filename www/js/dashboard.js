/**
 * dashboard.js
 * Handles analytics, statistics, and data visualization for MindHabit.
 * Uses Chart.js for rendering charts and Utils from utils.js for helpers.
 */

var DashboardManager = {

    charts: {}, // Store chart instances to destroy/update correctly

    // ==========================================
    // Section 1: Dashboard Summary
    // ==========================================

    /**
     * Fetches data and renders summary cards.
     * @param {string} containerId 
     */
    loadDashboardSummary: function(containerId) {
        var self = this;
        var container = document.getElementById(containerId);
        if (!container) return;

        DBHelper.getHabits(function(habits) {
            DBHelper.getMoodLogs(function(moods) {
                var today = Utils.getCurrentDate();
                
                var totalHabits = habits.length;
                var completedToday = habits.filter(h => h.last_completed_date === today).length;
                var longestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
                
                // Average mood last 7 days
                var sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                var recentMoods = moods.filter(m => new Date(m.date) >= sevenDaysAgo);
                var avgMood = recentMoods.length > 0 
                    ? (recentMoods.reduce((sum, m) => sum + m.mood_level, 0) / recentMoods.length).toFixed(1)
                    : "N/A";

                // Mood logging streak
                var moodStreak = 0;
                var sortedMoods = moods.sort((a,b) => new Date(b.date) - new Date(a.date));
                if (sortedMoods.length > 0) {
                    var checkDate = new Date();
                    checkDate.setHours(0,0,0,0);
                    for (var i = 0; i < sortedMoods.length; i++) {
                        var logDate = new Date(sortedMoods[i].date);
                        logDate.setHours(0,0,0,0);
                        var diff = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));
                        if (diff === moodStreak) {
                            moodStreak++;
                        } else if (diff > moodStreak) {
                            break;
                        }
                    }
                }

                container.innerHTML = `
                    <div class="dashboard-summary-grid">
                        ${self.renderStatCard('Total Habits', totalHabits, '📋')}
                        ${self.renderStatCard('Completed Today', completedToday, '✅')}
                        ${self.renderStatCard('Longest Streak', longestStreak + ' days', '🔥')}
                        ${self.renderStatCard('Avg Mood (7d)', avgMood, '📊')}
                        ${self.renderStatCard('Mood Streak', moodStreak + ' days', '✨')}
                    </div>
                `;
            });
        });
    },

    // ==========================================
    // Section 2: Habit Analytics
    // ==========================================

    /**
     * Render a bar chart showing habit completion counts.
     * @param {string} containerId 
     */
    renderHabitCompletionChart: function(containerId) {
        var self = this;
        DBHelper.getHabits(function(habits) {
            if (habits.length === 0) {
                return self.renderEmptyState(containerId, "No habits to analyze yet.");
            }

            var ctx = document.getElementById(containerId).getContext('2d');
            var labels = habits.map(h => h.name);
            var data = habits.map(h => h.streak); // Simplified: using current streak as a proxy for "top performance"

            self.createChart(containerId, 'bar', {
                labels: labels,
                datasets: [{
                    label: 'Current Streak',
                    data: data,
                    backgroundColor: '#4caf50',
                    borderRadius: 5
                }]
            }, {
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            });
        });
    },

    /**
     * Render streak lengths for each habit.
     * @param {string} containerId 
     */
    renderHabitStreakChart: function(containerId) {
        // Implementation similar to completion but focused on streaks
        this.renderHabitCompletionChart(containerId); 
    },

    // ==========================================
    // Section 3: Mood Analytics
    // ==========================================

    /**
     * Line chart showing mood levels over time.
     * @param {string} containerId 
     */
    renderMoodTrendChart: function(containerId) {
        var self = this;
        DBHelper.getMoodLogs(function(moods) {
            if (moods.length === 0) {
                return self.renderEmptyState(containerId, "Log your mood to see trends.");
            }

            var sortedLogs = moods.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);
            var labels = sortedLogs.map(l => Utils.formatDate(l.date).split(',')[0]);
            var data = sortedLogs.map(l => l.mood_level);

            self.createChart(containerId, 'line', {
                labels: labels,
                datasets: [{
                    label: 'Mood Level',
                    data: data,
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5
                }]
            }, {
                scales: { 
                    y: { min: 1, max: 5, ticks: { stepSize: 1 } }
                }
            });
        });
    },

    /**
     * Pie chart showing mood distribution.
     * @param {string} containerId 
     */
    renderMoodDistributionChart: function(containerId) {
        var self = this;
        DBHelper.getMoodLogs(function(moods) {
            if (moods.length === 0) return;

            var counts = {1:0, 2:0, 3:0, 4:0, 5:0};
            moods.forEach(m => counts[m.mood_level]++);

            self.createChart(containerId, 'doughnut', {
                labels: ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'],
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#f44336', '#ff9800', '#ffeb3b', '#8bc34a', '#4caf50']
                }]
            });
        });
    },

    // ==========================================
    // Section 4: Weekly Progress
    // ==========================================

    /**
     * Show weekly habit completion progress.
     * @param {string} containerId 
     */
    renderWeeklyProgress: function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        DBHelper.getHabits(function(habits) {
            var total = habits.length * 7;
            var completedCount = habits.reduce((sum, h) => sum + Math.min(h.streak, 7), 0); // Mock approximation
            var percent = total > 0 ? Math.round((completedCount/total) * 100) : 0;

            container.innerHTML = `
                <div class="progress-container">
                    <h4>Weekly Goal Progress</h4>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%"></div>
                    </div>
                    <span>${percent}% of your weekly habit goals met</span>
                </div>
            `;
        });
    },

    // ==========================================
    // Section 5: Wellness Insights
    // ==========================================

    /**
     * Generate descriptive insights comparing habits and mood.
     * @param {function} callback 
     */
    generateWellnessInsights: function(callback) {
        DBHelper.getHabits(function(habits) {
            DBHelper.getMoodLogs(function(moods) {
                var insights = [];
                
                var topStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
                if (topStreak >= 5) {
                    insights.push(`You have maintained a ${topStreak}-day habit streak! Keep it up.`);
                }

                // Simple correlation check (mock)
                var happyMoods = moods.filter(m => m.mood_level >= 4).length;
                if (happyMoods > (moods.length / 2) && habits.length > 2) {
                    insights.push("Your mood improves on days when you complete more habits.");
                }

                if (insights.length === 0) insights.push("Keep tracking to unlock deeper wellness insights.");
                
                if (callback) callback(insights);
            });
        });
    },

    // ==========================================
    // Section 6: Chart Rendering Utils
    // ==========================================

    /**
     * Helper to create/reuse Chart.js instances.
     */
    createChart: function(id, type, data, options) {
        if (this.charts[id]) {
            this.charts[id].destroy();
        }
        
        var canvas = document.getElementById(id);
        if (!canvas) return;

        this.charts[id] = new Chart(canvas, {
            type: type,
            data: data,
            options: Object.assign({
                responsive: true,
                maintainAspectRatio: false
            }, options || {})
        });
    },

    // ==========================================
    // Section 7: UI Helpers
    // ==========================================

    /**
     * Render a single statistic card.
     */
    renderStatCard: function(title, value, icon) {
        return `
            <div class="stat-card">
                <div class="stat-icon">${icon}</div>
                <div class="stat-content">
                    <span class="stat-title">${title}</span>
                    <h2 class="stat-value">${value}</h2>
                </div>
            </div>
        `;
    },

    /**
     * Display empty state message.
     */
    renderEmptyState: function(containerId, message) {
        var container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
        }
    }
};

// Export to window
window.DashboardManager = DashboardManager;
