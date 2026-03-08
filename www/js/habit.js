/**
 * habit.js
 * Manages habit tracking logic for the MindHabit application.
 * Interacts with DBHelper from db.js for SQLite persistence.
 */

var HabitManager = {

    // ==========================================
    // Section 1: Habit CRUD
    // ==========================================

    /**
     * Creates a new habit and saves it to the database.
     * @param {string} name - The name of the habit.
     * @param {string} category - mental_health, physical_health, productivity, self_care.
     * @param {string} frequency - daily, weekly.
     * @param {function} callback - success callback.
     */
    createHabit: function(name, category, frequency, callback) {
        var habitObj = {
            name: name,
            category: category,
            frequency: frequency,
            streak: 0,
            last_completed_date: null
        };

        DBHelper.addHabit(habitObj, function(res) {
            console.log('Habit created successfully:', name);
            if (callback) callback(res);
        }, function(err) {
            console.error('Error creating habit:', err);
        });
    },

    /**
     * Updates an existing habit's information.
     * @param {number} id - The habit ID.
     * @param {string} name 
     * @param {string} category 
     * @param {string} frequency 
     * @param {function} callback 
     */
    updateHabit: function(id, name, category, frequency, callback) {
        var updateObj = {
            name: name,
            category: category,
            frequency: frequency
        };

        DBHelper.updateHabit(id, updateObj, function(res) {
            console.log('Habit updated:', id);
            if (callback) callback(res);
        }, function(err) {
            console.error('Error updating habit:', err);
        });
    },

    /**
     * Deletes a habit by its ID.
     * @param {number} id 
     * @param {function} callback 
     */
    deleteHabit: function(id, callback) {
        DBHelper.deleteHabit(id, function(res) {
            console.log('Habit deleted:', id);
            if (callback) callback(res);
        }, function(err) {
            console.error('Error deleting habit:', err);
        });
    },

    /**
     * Retrieves all habits from the database.
     * @param {function} callback - Receives an array of habits.
     */
    getAllHabits: function(callback) {
        DBHelper.getHabits(function(habits) {
            if (callback) callback(habits);
        });
    },

    /**
     * Retrieves a single habit by ID.
     * @param {number} id 
     * @param {function} callback 
     */
    getHabitById: function(id, callback) {
        DBHelper.getHabits(function(habits) {
            var habit = habits.find(h => h.id === id);
            if (callback) callback(habit);
        });
    },

    // ==========================================
    // Section 2: Habit Completion Logic
    // ==========================================

    /**
     * Marks a habit as completed for today.
     * @param {number} id - Habit ID.
     * @param {function} callback 
     */
    completeHabit: function(id, callback) {
        var self = this;
        this.getHabitById(id, function(habit) {
            if (!habit) return console.error('Habit not found');

            var today = new Date().toISOString().split('T')[0];
            
            // Check if already completed today
            if (habit.last_completed_date === today) {
                console.log('Habit already completed today');
                if (callback) callback(habit);
                return;
            }

            var newStreak = self.calculateStreak(habit.last_completed_date, habit.streak);
            
            var updateObj = {
                streak: newStreak,
                last_completed_date: today
            };

            DBHelper.updateHabit(id, updateObj, function(res) {
                console.log('Habit completed! New streak:', newStreak);
                if (callback) callback(res);
            });
        });
    },

    /**
     * Logic to determine the new streak count.
     * @param {string} lastCompletedDate - ISO string (YYYY-MM-DD).
     * @param {number} currentStreak 
     * @returns {number} New streak count.
     */
    calculateStreak: function(lastCompletedDate, currentStreak) {
        if (!lastCompletedDate) return 1;

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var last = new Date(lastCompletedDate);
        last.setHours(0, 0, 0, 0);

        var diffTime = Math.abs(today - last);
        var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Completed yesterday
            return currentStreak + 1;
        } else if (diffDays === 0) {
            // Already completed today
            return currentStreak;
        } else {
            // Missed days
            return 1;
        }
    },

    // ==========================================
    // Section 3: Statistics
    // ==========================================

    /**
     * Calculate completion rate for the last 30 days.
     * Note: This implementation assumes a simple mock for now as 
     * full history tracking would require a separate log table.
     * @param {number} habitId 
     * @returns {number} Percentage
     */
    getHabitCompletionRate: function(habitId) {
        // Placeholder logic: in a real app, you'd count rows in a habit_logs table
        return Math.floor(Math.random() * 100); 
    },

    /**
     * Retrieve global statistics for all habits.
     * @param {function} callback 
     */
    getHabitStats: function(callback) {
        this.getAllHabits(function(habits) {
            var today = new Date().toISOString().split('T')[0];
            var completedToday = habits.filter(h => h.last_completed_date === today).length;
            var longestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
            
            var stats = {
                totalHabits: habits.length,
                completedToday: completedToday,
                longestStreak: longestStreak,
                averageCompletionRate: habits.length > 0 ? 75 : 0 // Mock avg
            };

            if (callback) callback(stats);
        });
    },

    // ==========================================
    // Section 4: UI Rendering Helpers
    // ==========================================

    /**
     * Dynamically renders the habit list into the UI.
     * @param {string} containerId - The ID of the DOM element.
     */
    renderHabitList: function(containerId) {
        var self = this;
        var container = document.getElementById(containerId);
        if (!container) return;

        this.getAllHabits(function(habits) {
            container.innerHTML = '';
            
            if (habits.length === 0) {
                container.innerHTML = '<p class="no-data">No habits tracked yet. Start one!</p>';
                return;
            }

            habits.forEach(function(habit) {
                var today = new Date().toISOString().split('T')[0];
                var isCompleted = habit.last_completed_date === today;
                
                var habitEl = document.createElement('div');
                habitEl.className = 'habit-card ' + (isCompleted ? 'completed' : '');
                habitEl.innerHTML = `
                    <div class="habit-info">
                        <h3 class="habit-name">${habit.name}</h3>
                        <span class="habit-category">${habit.category.replace('_', ' ')}</span>
                    </div>
                    <div class="habit-actions">
                        <span class="habit-streak">🔥 ${habit.streak}</span>
                        <button class="btn-complete" onclick="HabitManager.toggleHabitCompletion(${habit.id})">
                            ${isCompleted ? '✓' : 'Complete'}
                        </button>
                    </div>
                `;
                container.appendChild(habitEl);
            });
        });
    },

    /**
     * Toggles habit completion state.
     * @param {number} habitId 
     */
    toggleHabitCompletion: function(habitId) {
        var self = this;
        this.completeHabit(habitId, function() {
            // Re-render the list to update UI
            self.renderHabitList('habit-container');
        });
    }
};

// Export to window
window.HabitManager = HabitManager;
