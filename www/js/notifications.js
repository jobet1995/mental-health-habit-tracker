/**
 * notifications.js
 * Manages local notifications for habit reminders, mood check-ins, and wellness tips.
 * Uses cordova-plugin-local-notification.
 */

var NotificationManager = {

    // Notification IDs or Base IDs for categories
    ids: {
        mood_checkin: 1000,
        wellness_tip: 2000,
        habit_base: 3000 // Habit reminders will be habit_base + habitId
    },

    // ==========================================
    // Section 1: Initialization
    // ==========================================

    /**
     * Initializes notification permissions and sets default settings.
     */
    initNotifications: function() {
        var self = this;
        
        // 1. Check if Cordova plugin is available and has proxy
        var hasPlugin = (window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local);
        
        if (!hasPlugin) {
            console.warn('Cordova Notification plugin not fully available. Using Web Notification API fallback.');
            this.useFallback = true;
            return;
        }

        // 2. Request permissions (Cordova way)
        try {
            cordova.plugins.notification.local.hasPermission(function(granted) {
                if (!granted) {
                    cordova.plugins.notification.local.requestPermission(function(granted) {
                        console.log('Notification permission granted:', granted);
                    });
                }
            });

            // 3. Set default handlers
            this.setupEventHandlers();
            console.log('Notification Manager initialized via Plugin.');
        } catch (e) {
            console.error('Failed to initialize Plugin notifications, using fallback:', e);
            this.useFallback = true;
        }
    },

    // ==========================================
    // Section 2: Habit Notifications
    // ==========================================

    /**
     * Schedules a recurring daily reminder for a specific habit.
     * @param {number} habitId 
     * @param {string} habitName 
     * @param {Date} time - The time of day to trigger.
     */
    scheduleHabitReminder: function(habitId, habitName, time) {
        if (this.useFallback) {
            this.scheduleNativeNotification('Habit Reminder: ' + habitName, "Don't forget to complete your habit today!");
            return;
        }

        var id = this.ids.habit_base + parseInt(habitId);
        
        cordova.plugins.notification.local.schedule({
            id: id,
            title: 'Habit Reminder: ' + habitName,
            text: "Don't forget to complete your habit: " + habitName,
            trigger: { at: time, every: 'day' },
            foreground: true,
            priority: 2,
            smallIcon: 'res://icon',
            vibrate: true,
            wakeup: true,
            data: { type: 'habit_reminder', habitId: habitId }
        });
        
        console.log('Scheduled habit reminder for:', habitName, 'at', time);
    },

    /**
     * Fallback for environments where Cordova plugin fails (like Electron/Browser)
     */
    scheduleNativeNotification: function(title, body) {
        if (!("Notification" in window)) {
            console.error("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === "granted") {
            new Notification(title, { body: body });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    new Notification(title, { body: body });
                }
            });
        }
    },

    // ==========================================
    // Section 3: Mood Notifications
    // ==========================================

    /**
     * Schedules a daily notification reminding the user to log their mood.
     * @param {Date} time 
     */
    scheduleMoodCheckin: function(time) {
        cordova.plugins.notification.local.schedule({
            id: this.ids.mood_checkin,
            title: 'Mood Check-in',
            text: "How are you feeling today? Log your mood.",
            trigger: { at: time, every: 'day' },
            foreground: true,
            priority: 2,
            smallIcon: 'res://icon',
            vibrate: true,
            wakeup: true,
            data: { type: 'mood_checkin' }
        });

        console.log('Scheduled daily mood check-in at:', time);
    },

    // ==========================================
    // Section 4: Wellness Notifications
    // ==========================================

    /**
     * Schedules periodic motivational notifications.
     * @param {Date} time 
     */
    scheduleWellnessTip: function(time) {
        var tips = [
            "Take a deep breath and relax.",
            "A short walk can improve your mood.",
            "Drink some water and stay hydrated.",
            "Progress is progress, no matter how small.",
            "You are doing a great job!"
        ];
        var randomTip = tips[Math.floor(Math.random() * tips.length)];

        cordova.plugins.notification.local.schedule({
            id: this.ids.wellness_tip,
            title: 'Wellness Tip',
            text: randomTip,
            trigger: { at: time, every: 'day' },
            foreground: true,
            priority: 1,
            smallIcon: 'res://icon',
            data: { type: 'wellness_tip' }
        });

        console.log('Scheduled wellness tip at:', time);
    },

    // ==========================================
    // Section 5: Notification Management
    // ==========================================

    /**
     * Cancels a specific notification by ID.
     * @param {number} notificationId 
     */
    cancelNotification: function(notificationId) {
        cordova.plugins.notification.local.cancel(notificationId, function() {
            console.log('Notification cancelled:', notificationId);
        });
    },

    /**
     * Cancels all scheduled notifications.
     */
    cancelAllNotifications: function() {
        cordova.plugins.notification.local.cancelAll(function() {
            console.log('All notifications cancelled.');
        });
    },

    /**
     * Retrieves all scheduled notifications.
     * @param {function} callback 
     */
    listScheduledNotifications: function(callback) {
        cordova.plugins.notification.local.getScheduledIds(function(ids) {
            if (callback) callback(ids);
        });
    },

    // ==========================================
    // Section 6: Event Handlers
    // ==========================================

    /**
     * Sets up event listeners for notification triggers and interactions.
     */
    setupEventHandlers: function() {
        var self = this;

        // Triggered when a notification is displayed (foreground or background)
        cordova.plugins.notification.local.on('trigger', function(notification) {
            console.log('Notification triggered:', notification.id);
        });

        // Triggered when the user taps the notification
        cordova.plugins.notification.local.on('click', function(notification) {
            console.log('Notification clicked:', notification.id);
            self.handleNotificationClick(notification);
        });
    },

    /**
     * Deep linking logic when a notification is clicked.
     * @param {object} notification 
     */
    handleNotificationClick: function(notification) {
        var data = notification.data ? JSON.parse(notification.data) : {};
        
        switch (data.type) {
            case 'mood_checkin':
                // Logic to navigate to mood logger
                console.log('Navigating to Mood Tracker...');
                // app.navigateTo('mood');
                break;
            case 'habit_reminder':
                // Logic to navigate to a specific habit
                console.log('Navigating to Habit detail:', data.habitId);
                // app.navigateTo('habit', data.habitId);
                break;
            default:
                console.log('Notification clicked without specific route.');
        }
    }
};

// Export to window
window.NotificationManager = NotificationManager;
