/**
 * mood.js
 * Handles mood tracking, emotional notes, and mood analytics for MindHabit.
 * Interacts with DBHelper from db.js for SQLite persistence.
 * Uses jQuery for DOM manipulation.
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
        var today = Utils.getCurrentDate();

        // Check for existing entry for today
        DBHelper.getMoodByDate(today, function(existing) {
            if (existing) {
                console.warn('Mood already logged for today.');
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
        var now = Utils.getCurrentTimestamp();
        var updateObj = {
            mood_level: moodLevel,
            mood_label: moodLabel,
            notes: notes,
            updated_at: now
        };

        // Note: Using direct db reference if DBHelper doesn't have specific mood update
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
    renderMoodSelector: function(gridContainerId) {
        var $gridContainer = $('#' + gridContainerId);
        if ($gridContainer.length === 0) return;

        $gridContainer.html('<div class="mood-selector-grid"></div>');
        var $grid = $gridContainer.find('.mood-selector-grid');
        var $parentSection = $gridContainer.closest('#mood-selector-container');

        for (var level in this.moodIcons) {
            var iconData = this.moodIcons[level];
            var emoji = iconData.split(' ')[0];
            var labelText = iconData.split(' ')[1] + (iconData.split(' ').length > 2 ? ' ' + iconData.split(' ')[2] : '');
            var labelVal = labelText.toLowerCase().replace(' ', '_');
            
            var $moodBtn = $('<button/>', {
                class: 'mood-btn',
                'data-level': level,
                'data-label': labelVal,
                html: `<span>${emoji}</span><small>${labelText}</small>`
            });
            
            $grid.append($moodBtn);
        }
    },

    /**
     * Display mood history list using jQuery.
     * @param {string} containerId 
     */
    renderMoodHistory: function(containerId) {
        var $container = $('#' + containerId);
        if ($container.length === 0) return;

        this.getAllMoodLogs(function(logs) {
            $container.html('<ul class="mood-history-list"></ul>');
            var $list = $container.find('.mood-history-list');

            if (logs.length === 0) {
                $container.html('<div class="empty-habit-state opacity-50"><i class="fas fa-history empty-icon"></i><p class="empty-text">No mood logs yet.</p></div>');
                return;
            }

            logs.forEach(function(log) {
                var moodInfo = self.getMoodInfo(log.mood_level);
                
                // Use the professional template from App.templates
                var template = App.templates['mood-entry'] || '';
                var html = template
                    .replace(/{{id}}/g, log.id)
                    .replace(/{{emoji}}/g, moodInfo.emoji)
                    .replace(/{{label}}/g, moodInfo.label)
                    .replace(/{{colorClass}}/g, moodInfo.colorClass)
                    .replace(/{{note}}/g, log.notes || 'No thoughts recorded.') // Changed from log.note to log.notes based on existing code
                    .replace(/{{time}}/g, Utils.formatTime(log.timestamp)) // Need to ensure utils has formatTime
                    .replace(/{{date}}/g, Utils.formatDate(log.date));
                
                $list.append(html); // Append to $list, not $container
            });
        });
    },

    /**
     * Map mood level to object with label, emoji, and color.
     */
    getMoodInfo: function(level) {
        var moods = {
            1: { label: 'Very Sad', emoji: '😢', colorClass: 'danger' },
            2: { label: 'Sad', emoji: '😔', colorClass: 'warning' },
            3: { label: 'Neutral', emoji: '😐', colorClass: 'secondary' },
            4: { label: 'Happy', emoji: '😊', colorClass: 'success' },
            5: { label: 'Very Happy', emoji: '🤩', colorClass: 'primary' }
        };
        return moods[level] || moods[3];
    },

    /**
     * Visual calendar showing mood colors.
     * @param {string} containerId 
     */
    renderMoodCalendar: function(containerId) {
        var $container = $('#' + containerId);
        if ($container.length === 0) return;
        
        $container.html('<div class="mood-calendar-view"><p>Visual Calendar Placeholder</p></div>');
    }
};

// Export to window
window.MoodManager = MoodManager;
