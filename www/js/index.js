/**
 * index.js
 * Main controller for the MindHabit application.
 * Handles initialization, navigation, and lifecycle events.
 */

var App = {

    // ==========================================
    // Section 1: App Initialization
    // ==========================================

    /**
     * Entry point for the application.
     * Registers initial event listeners.
     */
    init: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // ==========================================
    // Section 2: Cordova Lifecycle Events
    // ==========================================

    /**
     * Triggered when Cordova device APIs are ready.
     */
    onDeviceReady: function() {
        console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
        
        // 1. Initialize Network Detection
        this.checkOnlineStatus();
        document.addEventListener("offline", this.onOffline.bind(this), false);
        document.addEventListener("online", this.onOnline.bind(this), false);

        // 2. Initialize Core Modules
        this.initModules();

        // 3. Register UI Event Handlers
        this.registerEvents();

        // 4. Load Initial Page
        this.loadPage('dashboard');
        
        // Lifecycle events
        document.addEventListener("pause", this.onPause.bind(this), false);
        document.addEventListener("resume", this.onResume.bind(this), false);
    },

    onPause: function() {
        console.log('App paused');
        // Save any temporary state if needed
    },

    onResume: function() {
        console.log('App resumed');
        // Refresh dynamic content
        this.refreshDashboard();
    },

    // ==========================================
    // Section 3: Navigation System
    // ==========================================

    /**
     * Dynamically loads HTML pages into the main container.
     * @param {string} pageName - Name of the page (without .html).
     */
    loadPage: function(pageName) {
        var self = this;
        var appContainer = document.getElementById('app');
        if (!appContainer) return;

        console.log('Loading page:', pageName);
        
        fetch('pages/' + pageName + '.html')
            .then(response => {
                if (!response.ok) throw new Error('Page not found: ' + pageName);
                return response.text();
            })
            .then(html => {
                appContainer.innerHTML = html;
                self.onPageLoaded(pageName);
            })
            .catch(error => {
                console.error('Error loading page:', error);
                appContainer.innerHTML = '<div class="error-page"><p>Failed to load ' + pageName + '</p></div>';
            });
    },

    /**
     * Logic to execute after a page is injected into the DOM.
     * @param {string} pageName 
     */
    onPageLoaded: function(pageName) {
        switch (pageName) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'habit-list':
                if (window.HabitManager) HabitManager.renderHabitList('habit-container');
                break;
            case 'mood-tracker':
                if (window.MoodManager) {
                    MoodManager.renderMoodSelector('mood-selector');
                    MoodManager.renderMoodHistory('mood-history');
                }
                break;
            // Add other page-specific init logic
        }
    },

    // ==========================================
    // Section 4: Module Initialization
    // ==========================================

    /**
     * Startup sequence for app modules.
     */
    initModules: function() {
        try {
            // 1. Database
            if (window.DBHelper) DBHelper.initDB();

            // 2. Notifications
            if (window.NotificationManager) NotificationManager.initNotifications();

            // 3. Settings (Load default if empty)
            if (window.DBHelper) {
                DBHelper.getSetting('app_initialized', function(val) {
                    if (!val) {
                        DBHelper.updateSetting('app_initialized', 'true');
                        console.log('First-time app setup complete.');
                    }
                });
            }
        } catch (e) {
            console.error('Module initialization failed:', e);
        }
    },

    // ==========================================
    // Section 5: UI Event Handlers
    // ==========================================

    /**
     * Global UI event registration.
     */
    registerEvents: function() {
        var self = this;

        // Navigation Menu
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var page = this.getAttribute('data-page');
                self.loadPage(page);
            });
        });

        // Delegate listener for buttons inside dynamically loaded pages
        document.addEventListener('click', function(e) {
            if (e.target.matches('#add-habit-btn')) {
                // Open add habit modal/page
                self.loadPage('add-habit');
            }
            if (e.target.matches('#refresh-dashboard')) {
                self.refreshDashboard();
            }
        });
    },

    // ==========================================
    // Section 6: Dashboard Logic
    // ==========================================

    /**
     * Specialized refresh logic for the dashboard.
     */
    refreshDashboard: function() {
        if (window.DashboardManager) {
            DashboardManager.loadDashboardSummary('dashboard-summary');
            DashboardManager.renderHabitCompletionChart('habit-chart');
            DashboardManager.renderMoodTrendChart('mood-chart');
            
            DashboardManager.generateWellnessInsights(function(insights) {
                var container = document.getElementById('insights-container');
                if (container) {
                    container.innerHTML = insights.map(i => `<p class="insight-p">${i}</p>`).join('');
                }
            });
        }
    },

    // ==========================================
    // Section 7: Network Detection
    // ==========================================

    checkOnlineStatus: function() {
        if (navigator.connection && navigator.connection.type === Connection.NONE) {
            this.onOffline();
        }
    },

    onOffline: function() {
        var banner = document.getElementById('offline-banner');
        if (banner) banner.style.display = 'block';
        console.log('Device is offline');
    },

    onOnline: function() {
        var banner = document.getElementById('offline-banner');
        if (banner) banner.style.display = 'none';
        console.log('Device is online');
    }
};

// Start the application
App.init();

// Export to window for global access
window.App = App;
