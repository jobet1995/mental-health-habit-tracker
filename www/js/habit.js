/**
 * habit.js
 * Manages habit tracking logic for the MindHabit application.
 * Interacts with DBHelper from db.js for SQLite persistence.
 * Uses jQuery for DOM manipulation.
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

            var today = Utils.getCurrentDate();
            
            // Check if already completed today
            if (habit.last_completed_date === today) {
                console.log('Habit already completed today');
                if (callback) callback(habit);
                return;
            }

            var newStreak = Utils.calculateStreak(habit.last_completed_date, habit.streak);
            
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

    // ==========================================
    // Section 3: Statistics
    // ==========================================

    /**
     * Retrieve global statistics for all habits.
     * @param {function} callback 
     */
    getHabitStats: function(callback) {
        this.getAllHabits(function(habits) {
            var today = Utils.getCurrentDate();
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
     * Dynamically renders the habit list into the UI using jQuery.
     * @param {string} containerId - The ID of the DOM element.
     */
    renderHabitList: function(containerId, filter) {
        var self = this;
        var $container = $('#' + containerId);
        if ($container.length === 0) return;

        this.getAllHabits(function(habits) {
            $container.empty();
            
            var filteredHabits = habits;
            if (filter && filter !== 'all') {
                filteredHabits = habits.filter(h => h.category === filter || 
                   (filter === 'mental' && h.category === 'mental_health') ||
                   (filter === 'physical' && h.category === 'physical_health') ||
                   (filter === 'self-care' && h.category === 'self_care'));
            }

            if (filteredHabits.length === 0) {
                $container.html('<div class="empty-habit-state opacity-50"><i class="fas fa-clipboard-list empty-icon"></i><p class="empty-text">No habits found in this category.</p></div>');
                return;
            }

            filteredHabits.forEach(function(habit) {
                var today = Utils.getCurrentDate();
                var isCompleted = habit.last_completed_date === today;
                
                // Use the professional template from App.templates
                var template = App.templates['habit-card'] || '';
                var html = template
                    .replace(/{{id}}/g, habit.id)
                    .replace(/{{name}}/g, habit.name)
                    .replace(/{{category}}/g, Utils.capitalizeFirstLetter(habit.category.replace('_', ' ')))
                    .replace(/{{categoryIcon}}/g, self.getCategoryIcon(habit.category))
                    .replace(/{{streak}}/g, habit.streak)
                    .replace(/{{frequency}}/g, Utils.capitalizeFirstLetter(habit.frequency))
                    .replace(/{{completedClass}}/g, isCompleted ? 'completed' : '')
                    .replace(/{{completionPercent}}/g, isCompleted ? 100 : 0); // Simplified logic
                
                $container.append(html);
            });
        });
    },

    /**
     * Get aggregate statistics for the home screen and dashboard.
     * @param {function} callback 
     */
    getHabitStats: function(callback) {
        DBHelper.getHabits(function(habits) {
            var today = Utils.getCurrentDate();
            var total = habits.length;
            var completedToday = habits.filter(h => h.last_completed_date === today).length;
            
            if (callback) callback({
                totalHabits: total,
                completedToday: completedToday
            });
        });
    },

    /**
     * Map category code to Font Awesome icon.
     */
    getCategoryIcon: function(category) {
        var icons = {
            'mental_health': 'fa-brain',
            'physical_health': 'fa-dumbbell',
            'productivity': 'fa-briefcase',
            'self_care': 'fa-spa'
        };
        return icons[category] || 'fa-check-circle';
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
            
            // Trigger haptic-like scale effect via jQuery
            $('.habit-card[data-id="' + habitId + '"]').addClass('scale-in');
        });
    }
};

// Export to window
window.HabitManager = HabitManager;
