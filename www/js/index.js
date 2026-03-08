/**
 * index.js
 * Main controller for the MindHabit application.
 * Handles initialization, navigation, and lifecycle events using jQuery and AJAX.
 */

var App = {

    templates: {}, // Cache for shared HTML templates

    // ==========================================
    // Section 1: App Initialization
    // ==========================================

    /**
     * Entry point for the application.
     * Registers initial event listeners.
     */
    init: function() {
        // USE NATIVE LISTENERS for Cordova events to avoid jQuery dispatcher TypeErrors
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener('pause', this.onPause.bind(this), false);
        document.addEventListener('resume', this.onResume.bind(this), false);
        document.addEventListener('offline', this.onOffline.bind(this), false);
        document.addEventListener('online', this.onOnline.bind(this), false);
    },

    // ==========================================
    // Section 2: Cordova Lifecycle Events
    // ==========================================

    /**
     * Triggered when Cordova device APIs are ready.
     */
    onDeviceReady: function() {
        console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
        
        // 1. IMMEDIATE AUTH CHECK - This must happen first to decide the initial view
        var isLoggedIn = false;
        try {
            if (window.AuthManager && AuthManager.isLoggedIn()) {
                isLoggedIn = true;
            }
        } catch(e) { console.error('Auth Check Error:', e); }

        // 2. Load the correct page IMMEDIATELY (skipping transition for speed)
        if (isLoggedIn) {
            this.toggleAuthUI(true);
            this.loadPage('home', true); // true = skipTransition
        } else {
            this.toggleAuthUI(false);
            this.loadPage('login', true); // true = skipTransition
        }

        // 3. Initialize background processes (Network, Modules, Components)
        this.checkOnlineStatus();
        this.initModules();
        if (isLoggedIn) {
            this.loadComponents(); // Only load header/footer if logged in
        }
        this.registerEvents();

        // 4. Force state recovery for DB-dependent views
        if (isLoggedIn && !$('#app-loader').is(':visible')) {
            setTimeout(() => { this.onPageLoaded($('.nav-link.active-page').data('page') || 'home'); }, 500);
        }

        // 4. Safety Timeout
        setTimeout(function() {
            if ($('#app-loader').is(':visible')) {
                $('#app-loader').fadeOut(300);
            }
        }, 5000);
    },

    onPause: function() {
        console.log('App paused');
        // Save any temporary state if needed
    },

    onResume: function() {
        console.log('App resumed');
        // Refresh current page if needed
        var currentPage = $('.nav-link.active-page').data('page') || 'home';
        this.loadPage(currentPage);
    },

    // ==========================================
    // Section 3: Component Loading
    // ==========================================

    /**
     * Loads shared UI components (Header/Footer) into the main index.html.
     */
    loadComponents: function() {
        var self = this;
        
        // Load Header
        $.get('components/header.html', function(html) {
            console.log('Component Loaded: Header');
            $('#header-container').html(html);
        }).fail(function() { console.error('Failed to load Header component'); });

        // Load Footer
        $.get('components/footer.html', function(html) {
            console.log('Component Loaded: Footer');
            $('#footer-container').html(html);
            self.updateNavActiveState($('.nav-link.active-page').data('page') || 'home');
        }).fail(function() { console.error('Failed to load Footer component'); });

        // Load Component Templates for Dynamic Rendering
        var componentFiles = ['habit-card', 'mood-entry', 'chart-component'];
        componentFiles.forEach(function(file) {
            $.get('components/' + file + '.html', function(html) {
                console.log('Template Loaded:', file);
                self.templates[file] = html;
            }).fail(function() { console.error('Failed to load template:', file); });
        });
    },

    // ==========================================
    // Section 3: Navigation System
    // ==========================================

    /**
     * Dynamically loads HTML pages into the main container using AJAX.
     * @param {string} pageName - Name of the page (without .html).
     * @param {boolean} skipTransition - If true, injects immediately without fading.
     */
    loadPage: function(pageName, skipTransition) {
        var self = this;
        var $appContainer = $('#app');
        if ($appContainer.length === 0) return;

        console.log('Loading page via AJAX:', pageName);
        
        // Update active state in footer
        this.updateNavActiveState(pageName);

        $.ajax({
            url: 'pages/' + pageName + '.html',
            method: 'GET',
            dataType: 'html',
            success: function(html) {
                console.log('Page Loaded Successfully:', pageName);
                
                if (skipTransition) {
                    $appContainer.html(html).show();
                    $('#app-loader').hide(); // Hide loader immediately
                    self.onPageLoaded(pageName);
                } else {
                    // Smooth transition: fade out, swap, fade in
                    $appContainer.fadeOut(150, function() {
                        $(this).html(html).fadeIn(150);
                        self.onPageLoaded(pageName);
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading page:', error);
                $appContainer.html('<div class="error-page py-5 text-center"><i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i><p>Failed to load ' + pageName + '</p></div>');
            }
        });
    },

    /**
     * Updates the visual active state in the navigation bar.
     */
    updateNavActiveState: function(pageName) {
        $('.nav-link').removeClass('active-page');
        $('.nav-link[data-page="' + pageName + '"]').addClass('active-page');
    },

    /**
     * Logic to execute after a page is injected into the DOM.
     * @param {string} pageName 
     */
    onPageLoaded: function(pageName) {
        switch (pageName) {
            case 'home':
                this.refreshHomeStats();
                break;
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'habit-list':
                if (window.HabitManager) HabitManager.renderHabitList('habit-container');
                break;
            case 'mood-tracker':
                console.log('Mood Tracker loaded, initializing components...');
                if (window.MoodManager) {
                    MoodManager.renderMoodSelector('mood-grid-container');
                    MoodManager.renderMoodHistory('mood-history-container');
                } else {
                    console.error('MoodManager not found during page load');
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
     * Global UI event registration using jQuery delegation.
     */
    registerEvents: function() {
        var self = this;

        // 1. Navigation (Links with data-page)
        $(document).on('click', '.nav-link', function(e) {
            e.preventDefault();
            var page = $(this).data('page');
            if (page) self.loadPage(page);
        });

        // 2. Generic "Load Page" actions (Buttons with data-action="load-page")
        $(document).on('click', '[data-action="load-page"]', function(e) {
            e.preventDefault();
            var page = $(this).data('page');
            if (page) self.loadPage(page);
        });

        // 3. Habit Management
        $(document).on('click', '[data-action="add-habit"]', function() {
            self.loadPage('add-habit');
        });

        // Habit Form Submission
        $(document).on('submit', '#add-habit-form', function(e) {
            e.preventDefault();
            self.saveNewHabit();
        });

        $(document).on('click', '[data-action="edit-habit"]', function() {
            var id = $(this).data('id');
            // Store ID for the edit page to pick up if needed, or load special edit page
            console.log('Edit habit triggered for ID:', id);
            // In a real app, you might load "edit-habit" page with ID in params
            // For now, let's just go to add-habit or show a placeholder
            App.loadPage('add-habit'); 
        });

        $(document).on('click', '.habit-toggle-btn', function() {
            var id = $(this).data('id');
            if (window.HabitManager) HabitManager.toggleHabitCompletion(id);
        });

        // Habit Filtering
        $(document).on('click', '[data-filter]', function() {
            var filter = $(this).data('filter');
            $('.habit-toolbar button').removeClass('active-filter');
            $(this).addClass('active-filter');
            if (window.HabitManager) HabitManager.renderHabitList('habit-container', filter);
        });

        // 4. Mood Management
        $(document).on('click', '#save-mood-btn', function() {
            self.logMoodWithNotes();
        });

        // Mood selection logic
        $(document).on('click', '.mood-btn', function() {
            var $parentSection = $(this).closest('[data-mood-selector]');
            $('.mood-btn').removeClass('active-mood-btn');
            $(this).addClass('active-mood-btn');
            
            // Store selection for the Save button
            if ($parentSection.length > 0) {
                $parentSection.attr('data-selected-level', $(this).data('level'));
                $parentSection.attr('data-selected-label', $(this).data('label'));
            }
        });

        $(document).on('click', '[data-action="edit-mood"]', function(e) {
            e.preventDefault();
            var id = $(this).data('id');
            if (window.MoodManager) MoodManager.editMoodEntry(id);
        });

        $(document).on('click', '[data-action="delete-mood"]', function(e) {
            e.preventDefault();
            var id = $(this).data('id');
            if (window.MoodManager) MoodManager.deleteMoodEntry(id);
        });

        // 5. Settings & Preferences
        $(document).on('change', '#reminder-switch', function() {
            self.toggleNotifications(this.checked);
        });

        $(document).on('change', '#dark-mode-switch', function() {
            self.toggleDarkMode(this.checked);
        });

        $(document).on('click', '[data-action="edit-profile"]', function() {
            if (self.showEditProfile) self.showEditProfile();
            else console.log('Edit Profile action triggered');
        });

        $(document).on('click', '[data-action="show-help"]', function() {
            if (self.showHelp) self.showHelp();
            else console.log('Show Help action triggered');
        });

        $(document).on('click', '[data-action="export-data"]', function() {
            if (self.exportData) self.exportData();
            else console.log('Export Data action triggered');
        });

        $(document).on('click', '#refresh-dashboard', function() {
            self.refreshDashboard();
        });

        // 6. Auth Actions
        $(document).on('submit', '#login-form', function(e) {
            e.preventDefault();
            var email = $('#login-email').val();
            var pass = $('#login-password').val();
            
            if (window.AuthManager) {
                AuthManager.login(email, pass, function(success, err) {
                    if (success) {
                        console.log('Login successful, preparing UI...');
                        App.toggleAuthUI(true);
                        App.loadComponents(); 
                        
                        // Small delay to ensure components are loading before we swap pages
                        setTimeout(function() {
                            App.loadPage('home');
                        }, 100);
                    } else {
                        alert(err || 'Login failed');
                    }
                });
            }
        });

        $(document).on('submit', '#signup-form', function(e) {
            e.preventDefault();
            var name = $('#signup-name').val();
            var email = $('#signup-email').val();
            var pass = $('#signup-password').val();
            
            if (window.AuthManager) {
                AuthManager.signup(name, email, pass, function(success, err) {
                    if (success) {
                        console.log('Signup successful, preparing UI...');
                        App.toggleAuthUI(true);
                        App.loadComponents();
                        
                        setTimeout(function() {
                            App.loadPage('home');
                        }, 100);
                    } else {
                        alert(err || 'Signup failed');
                    }
                });
            }
        });

        $(document).on('click', '[data-action="logout"]', function(e) {
            e.preventDefault();
            if (window.AuthManager) {
                AuthManager.logout();
                App.toggleAuthUI(false); // Hide Header/Footer
                $('#header-container, #footer-container').empty(); // Clear content
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
            DashboardManager.renderHabitCompletionChart('habitCompletionChart');
            DashboardManager.renderMoodTrendChart('moodTrendChart');
            DashboardManager.renderMoodDistributionChart('moodDistChart');
            
            DashboardManager.generateWellnessInsights(function(insights) {
                var $container = $('#wellness-insights-container');
                if ($container.length > 0) {
                    var html = insights.map(i => `<div class="alert alert-soft-primary rounded-4 border-0 p-3 mb-2 small text-secondary">
                        <i class="fas fa-info-circle text-primary me-2"></i> ${i}
                    </div>`).join('');
                    $container.html(html);
                }
            });
        }
    },

    // ==========================================
    // Section 8: Quick Action Stubs
    // ==========================================

    saveNewHabit: function() {
        var self = this;
        var name = $('#habit-name').val();
        var category = $('input[name="habit-category"]:checked').val();
        var frequency = $('#habit-frequency').val();

        if (!name) return;

        if (window.HabitManager) {
            HabitManager.createHabit(name, category, frequency, function() {
                // Success: Go back to habit list
                self.loadPage('habit-list');
                
                // Show a simple toast or notification if implemented
                console.log('Habit Saved!');
            });
        }
    },

    showAddHabitModal: function() {
        this.loadPage('add-habit');
    },

    logMoodWithNotes: function() {
        var self = this;
        var level = $('#mood-selector-container').attr('data-selected-level');
        var label = $('#mood-selector-container').attr('data-selected-label');
        var notes = $('#mood-notes').val();

        if (!level) {
            alert('Please select a mood first!');
            return;
        }

        console.log('Logging mood:', level, label, notes);
        
        if (window.MoodManager) {
            MoodManager.logMood(parseInt(level), label, notes, function(res) {
                console.log('Mood Saved!');
                // Success: Go back to home or dashboard
                self.loadPage('home');
            });
        }
    },

    toggleNotifications: function(enabled) {
        console.log('Notifications toggled:', enabled);
    },

    toggleDarkMode: function(enabled) {
        $('body').toggleClass('dark-mode', enabled);
    },

    /**
     * Updates daily progress stats on the Home page.
     */
    refreshHomeStats: function() {
        if (window.HabitManager) {
            HabitManager.getHabitStats(function(stats) {
                var percent = stats.totalHabits > 0 ? Math.round((stats.completedToday / stats.totalHabits) * 100) : 0;
                var remaining = stats.totalHabits - stats.completedToday;

                $('#home-progress-badge').text(percent + '% Done');
                $('#home-progress-bar').css('width', percent + '%').attr('aria-valuenow', percent);
                $('#home-completed-count').text(stats.completedToday + ' habits completed');
                $('#home-remaining-count').text(remaining + ' remaining');
            });
        }
    },

    /**
     * Toggles visibility of header/footer based on authentication state.
     */
    toggleAuthUI: function(isLoggedIn) {
        if (isLoggedIn) {
            $('#header-container, #footer-container').show();
            $('body').removeClass('auth-page');
            $('#app').removeClass('p-0').addClass('container');
        } else {
            $('#header-container, #footer-container').hide();
            $('body').addClass('auth-page');
            $('#app').addClass('p-0').removeClass('container');
        }
    },

    // ==========================================
    // Section 7: Network Detection
    // ==========================================

    checkOnlineStatus: function() {
        var isOffline = false;
        
        try {
            // Check navigator.onLine first as it's the standard
            if (typeof navigator.onLine !== 'undefined' && navigator.onLine === false) {
                isOffline = true;
            }

            // Check Cordova connection plugin if available
            var connObj = window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection;
            if (connObj && connObj.type) {
                var type = connObj.type;
                var NONE_VAL = (window.Connection && window.Connection.NONE) ? window.Connection.NONE : 'none';
                if (type === 'none' || type === NONE_VAL) {
                    isOffline = true;
                }
            }
        } catch (e) {
            console.warn('Network status check partial failure:', e);
        }

        if (isOffline) {
            this.onOffline();
        } else {
            this.onOnline();
        }
    },

    onOffline: function() {
        $('#offline-indicator').removeClass('d-none');
        console.log('Device is offline');
    },

    onOnline: function() {
        $('#offline-indicator').addClass('d-none');
        console.log('Device is online');
    }
};

// Global Error Handler for debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('MindHabit Global Error:', msg, 'at', url, ':', lineNo);
    return false;
};

// Start the application after DOM is ready
$(function() {
    console.log('DOM Ready - Initializing App');
    App.init();

    // IMMEDIATE LOAD: Don't wait for deviceready to show the first screen
    // This makes the UI feel much faster and ensures login loads first.
    var isLoggedIn = false;
    try {
        isLoggedIn = localStorage.getItem('mh_session_token') !== null;
    } catch(e) {}

    if (isLoggedIn) {
        window.isAppLoggedIn = true; // Global flag for faster checks
        App.toggleAuthUI(true);
        App.loadPage('home', true);
        App.loadComponents();
    } else {
        window.isAppLoggedIn = false;
        App.toggleAuthUI(false);
        App.loadPage('login', true);
    }
});

// Export to window for global access
window.App = App;
