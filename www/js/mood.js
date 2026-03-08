/**
 * mood.js
 * Handles mood tracking, emotional notes, and mood analytics for MindHabit.
 * Interacts with DBHelper from db.js for SQLite persistence.
 */

var MoodManager = {

    // Icon Mapping: Mood level to emoji
    moodIcons: {
        1: '😢 Very Sad',
        2: '🙁 Sad',
        3: '😐 Neutral',
        4: '🙂 Happy',
        5: '😄 Very Happy'
    },

    // ==========================================
    // Section 1: Mood CRUD Functions
    // ==========================================

    /**
     * Logs a new mood entry for the current date.
     * Prevents duplicate entries for the same date.
     * @param {number} moodLevel - integer 1 to 5.
     * @param {string} moodLabel - very_sad, sad, neutral, happy, very_happy.
     * @param {string} notes - optional text.
     * @param {function} callback - success callback.
     */
    logMood: function(moodLevel, moodLabel, notes, callback) {
        var self = this;
        var today = new Date().toISOString().split('T')[0];

        // Check for existing entry for today
        DBHelper.getMoodByDate(today, function(existing) {
            if (existing) {
                console.warn('Mood already logged for today. Update instead?');
                if (callback) callback({ status: 'duplicate', id: existing.id });
                return;
            }

            var moodObj = {
                mood_level: moodLevel,
                mood_label: moodLabel,
                notes: notes,
                date: today
            };

            DBHelper.addMoodLog(moodObj, function(res) {
                console.log('Mood logged successfully for', today);
                if (callback) callback(res);
            });
        });
    },

    /**
     * Updates an existing mood entry.
     * @param {number} id - Record ID.
     * @param {number} moodLevel 
     * @param {string} moodLabel 
     * @param {string} notes 
     * @param {function} callback 
     */
    updateMoodEntry: function(id, moodLevel, moodLabel, notes, callback) {
        // We'll update DBHelper's implementation or use a direct update here
        // Assuming DBHelper.updateMoodLog exists or needs implementation
        // For this module, we'll implement update logic for settings/habits style
        var now = new Date().toISOString();
        var updateObj = {
            mood_level: moodLevel,
            mood_label: moodLabel,
            notes: notes,
            updated_at: now
        };

        // If DBHelper doesn't have updateMoodLog, we call direct SQL or extend DBHelper
        // Let's assume we use a pattern similar to updateHabit
        db.transaction(function(tx) {
            var query = 'UPDATE mood_logs SET mood_level = ?, mood_label = ?, notes = ?, updated_at = ? WHERE id = ?';
            tx.executeSql(query, [moodLevel, moodLabel, notes, now, id], function(tx, res) {
                if (callback) callback(res);
            });
        });
    },

    /**
     * Removes a mood record from the database.
     * @param {number} id 
     * @param {function} callback 
     */
    deleteMoodEntry: function(id, callback) {
        db.transaction(function(tx) {
            var query = 'DELETE FROM mood_logs WHERE id = ?';
            tx.executeSql(query, [id], function(tx, res) {
                if (callback) callback(res);
            });
        });
    },

    /**
     * Retrieve mood entry for a specific date.
     * @param {string} date - YYYY-MM-DD.
     * @param {function} callback 
     */
    getMoodByDate: function(date, callback) {
        DBHelper.getMoodByDate(date, callback);
    },

    /**
     * Retrieve all mood entries sorted by date descending.
     * @param {function} callback 
     */
    getAllMoodLogs: function(callback) {
        DBHelper.getMoodLogs(callback);
    },

    // ==========================================
    // Section 2: Mood Analytics
    // ==========================================

    /**
     * Calculate the average mood level for the past X days.
     * @param {number} days 
     * @param {function} callback 
     */
    getAverageMood: function(days, callback) {
        this.getAllMoodLogs(function(logs) {
            var cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            
            var filtered = logs.filter(l => new Date(l.date) >= cutoff);
            if (filtered.length === 0) return callback(0);

            var total = filtered.reduce((sum, l) => sum + l.mood_level, 0);
            callback((total / filtered.length).toFixed(1));
        });
    },

    /**
     * Return mood values grouped by day for trend visualization.
     * @param {number} days 
     * @param {function} callback 
     */
    getMoodTrend: function(days, callback) {
        this.getAllMoodLogs(function(logs) {
            var cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            
            var trend = logs.filter(l => new Date(l.date) >= cutoff)
                            .map(l => ({ date: l.date, value: l.mood_level }))
                            .reverse();
            callback(trend);
        });
    },

    /**
     * Determine the most frequently recorded mood.
     * @param {function} callback 
     */
    getMostCommonMood: function(callback) {
        this.getAllMoodLogs(function(logs) {
            if (logs.length === 0) return callback(null);
            
            var counts = {};
            logs.forEach(l => {
                counts[l.mood_label] = (counts[l.mood_label] || 0) + 1;
            });

            var mostCommon = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            callback(mostCommon);
        });
    },

    /**
     * Calculate consecutive days mood was logged.
     * @param {function} callback 
     */
    getMoodStreak: function(callback) {
        this.getAllMoodLogs(function(logs) {
            if (logs.length === 0) return callback(0);
            
            var streak = 0;
            var today = new Date();
            today.setHours(0,0,0,0);
            
            for (var i = 0; i < logs.length; i++) {
                var logDate = new Date(logs[i].date);
                logDate.setHours(0,0,0,0);
                
                var diff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
                
                if (diff === streak) {
                    streak++;
                } else if (diff > streak) {
                    break;
                }
            }
            callback(streak);
        });
    },

    // ==========================================
    // Section 3: Mood Insights
    // ==========================================

    /**
     * Analyze mood data and generate descriptive insights.
     * @param {function} callback 
     */
    generateMoodInsight: function(callback) {
        var self = this;
        this.getAverageMood(7, function(avg7) {
            self.getAverageMood(30, function(avg30) {
                var insight = "Not enough data yet to generate insights.";
                
                if (avg7 > 0 && avg30 > 0) {
                    if (avg7 > avg30) {
                        insight = "Your mood has improved over the last 7 days compared to your monthly average.";
                    } else if (avg7 < avg30) {
                        insight = "You've been feeling a bit lower this week. Remember to practice self-care.";
                    } else {
                        insight = "Your emotional patterns remain stable. Keep maintaining your habits!";
                    }
                }
                callback(insight);
            });
        });
    },

    // ==========================================
    // Section 4: UI Rendering Helpers
    // ==========================================

    /**
     * Display mood options using icons.
     * @param {string} containerId 
     */
    renderMoodSelector: function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="mood-selector-grid"></div>';
        var grid = container.querySelector('.mood-selector-grid');

        for (var level in this.moodIcons) {
            var icon = this.moodIcons[level];
            var label = icon.split(' ')[1].toLowerCase().replace(' ', '_');
            
            var moodBtn = document.createElement('button');
            moodBtn.className = 'mood-btn';
            moodBtn.innerHTML = `<span>${icon.split(' ')[0]}</span><small>${icon.split(' ')[1]}</small>`;
            moodBtn.onclick = (function(l, lbl) {
                return function() { MoodManager.logMood(parseInt(l), lbl, ''); };
            })(level, label);
            
            grid.appendChild(moodBtn);
        }
    },

    /**
     * Display mood history list.
     * @param {string} containerId 
     */
    renderMoodHistory: function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        this.getAllMoodLogs(function(logs) {
            container.innerHTML = '<ul class="mood-history-list"></ul>';
            var list = container.querySelector('.mood-history-list');

            logs.forEach(log => {
                var item = document.createElement('li');
                item.className = 'mood-history-item';
                var icon = MoodManager.moodIcons[log.mood_level] ? MoodManager.moodIcons[log.mood_level].split(' ')[0] : '❓';
                
                item.innerHTML = `
                    <div class="mood-entry-icon">${icon}</div>
                    <div class="mood-entry-details">
                        <span class="mood-entry-date">${log.date}</span>
                        <p class="mood-entry-notes">${log.notes || 'No notes added'}</p>
                    </div>
                `;
                list.appendChild(item);
            });
        });
    },

    /**
     * Visual calendar showing mood colors.
     * @param {string} containerId 
     */
    renderMoodCalendar: function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        
        // Basic placeholder for calendar logic
        container.innerHTML = '<div class="mood-calendar-view"><p>Visual Calendar Placeholder</p></div>';
    }
};

// Export to window
window.MoodManager = MoodManager;
