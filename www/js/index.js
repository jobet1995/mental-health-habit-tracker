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
            case 'mood-analytics':
                console.log('Mood Analytics loaded');
                if (window.DashboardManager) {
                    // Add a tiny delay to ensure DOM is fully ready and painted for Chart.js
                    setTimeout(function() {
                        DashboardManager.renderMoodTrendChart('moodTrendChartAnalytics');
                        DashboardManager.renderMoodDistributionChart('moodDistChartAnalytics');
                        DashboardManager.generateWellnessInsights(function(insights) {
                            var $container = $('#mood-insights-container');
                            if ($container.length > 0) {
                                var html = insights.map(i => `<div class="alert alert-soft-primary rounded-4 border-0 p-3 mb-2 small text-secondary">
                                    <i class="fas fa-info-circle text-primary me-2"></i> ${i}
                                </div>`).join('');
                                $container.html(html);
                            }
                        });
                    }, 100);
                }
                break;
            case 'edit-habit':
                var editId = localStorage.getItem('mh_edit_habit_id');
                if (editId && window.HabitManager) {
                    HabitManager.getHabitById(parseInt(editId), function(habit) {
                        if (habit) {
                            $('#edit-habit-id').val(habit.id);
                            $('#edit-habit-name').val(habit.name);
                            $('#edit-habit-frequency').val(habit.frequency);
                            $(`input[name="edit-habit-category"][value="${habit.category}"]`).prop('checked', true);
                        }
                    });
                }
                break;
            case 'settings':
                this.loadSavedProfile();
                // Sync dark mode switch state
                var isDark = localStorage.getItem('mh_dark_mode') === 'true';
                $('#dark-mode-switch').prop('checked', isDark);
                break;
            case 'profile':
                this.loadProfileData();
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
            // Load the edit page and pass the ID via a global state or localStorage
            localStorage.setItem('mh_edit_habit_id', id);
            App.loadPage('edit-habit'); 
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
            self.loadPage('profile');
        });

        $(document).on('click', '[data-action="show-help"]', function() {
            self.loadPage('help-center');
        });

        $(document).on('click', '[data-action="export-data"]', function() {
            alert('Data export started. Your wellness report will be generated as a PDF soon.');
        });

        $(document).on('click', '[data-action="close-modal"]', function() {
            $('#app-modal').remove();
        });

        $(document).on('click', '[data-action="change-photo"]', function() {
            self.handleChangePhoto();
        });

        $(document).on('change', '#profile-photo-input', function(e) {
            self.handleFileSelect(e);
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

        // 7. Edit Habit Handlers
        $(document).on('submit', '#edit-habit-form', function(e) {
            e.preventDefault();
            App.saveEditedHabit();
        });

        $(document).on('click', '#delete-habit-btn', function() {
            var id = $('#edit-habit-id').val();
            if (id && confirm('Are you sure you want to delete this habit?')) {
                if (window.HabitManager) {
                    HabitManager.deleteHabit(parseInt(id), function() {
                        App.loadPage('habit-list');
                    });
                }
            }
        });

        // 8. Profile Form Handlers
        $(document).on('submit', '#profile-edit-form', function(e) {
            e.preventDefault();
            self.saveProfileData();
        });
    },

    saveEditedHabit: function() {
        var self = this;
        var id = $('#edit-habit-id').val();
        var name = $('#edit-habit-name').val();
        var category = $('input[name="edit-habit-category"]:checked').val();
        var frequency = $('#edit-habit-frequency').val();

        if (window.HabitManager && id) {
            HabitManager.updateHabit(parseInt(id), name, category, frequency, function() {
                self.loadPage('habit-list');
            });
        }
    },

    /**
     * Simple modal helper for basic interactions.
     */
    showModal: function(title, content) {
        var modalHtml = `
            <div id="app-modal" class="modal-backdrop d-flex align-items-center justify-content-center p-4" style="background: rgba(0,0,0,0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1050;">
                <div class="modal-content bg-white rounded-4 shadow-lg overflow-hidden animate-slide-up" style="max-width: 400px; width: 100%;">
                    <div class="modal-header border-0 p-3 d-flex justify-content-between align-items-center">
                        <h5 class="mb-0 fw-bold">${title}</h5>
                        <button class="btn-close" data-action="close-modal"></button>
                    </div>
                    <div class="modal-body p-0">${content}</div>
                    <div class="modal-footer border-0 p-3 pt-0">
                        <button class="btn btn-primary w-100 rounded-pill" data-action="close-modal">Got it</button>
                    </div>
                </div>
            </div>
        `;
        $('body').append(modalHtml);
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

    /**
     * Camera & Photo Logic
     */
    handleChangePhoto: function() {
        var self = this;
        // Check if camera plugin is available
        if (navigator.camera) {
            navigator.camera.getPicture(function(imageUri) {
                self.saveProfilePhoto(imageUri);
            }, function(err) {
                console.error('Camera error:', err);
                // Fallback if user cancels or error occurs (try file input)
                $('#profile-photo-input').click();
            }, {
                quality: 50,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: Camera.PictureSourceType.CAMERA,
                encodingType: Camera.EncodingType.JPEG,
                mediaType: Camera.MediaType.PICTURE,
                allowEdit: true,
                correctOrientation: true
            });
        } else {
            // Web/Electron Fallback
            $('#profile-photo-input').click();
        }
    },

    handleFileSelect: function(event) {
        var self = this;
        var file = event.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                self.saveProfilePhoto(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    },

    saveProfilePhoto: function(imageData) {
        localStorage.setItem('mh_user_photo', imageData);
        this.updateProfileUI(imageData);
    },

    loadSavedProfile: function() {
        var photo = localStorage.getItem('mh_user_photo');
        if (photo) {
            this.updateProfileUI(photo);
        }
        
        var name = localStorage.getItem('mh_user_name');
        if (name) {
            $('#display-user-name').text(name);
        }
    },

    updateProfileUI: function(imageData) {
        var $avatar = $('#user-avatar, #edit-profile-avatar');
        if ($avatar.length > 0) {
            $avatar.html('<img src="' + imageData + '" alt="Profile" class="rounded-circle shadow-sm">');
        }
    },

    loadProfileData: function() {
        var name = localStorage.getItem('mh_user_name') || '';
        var bio = localStorage.getItem('mh_user_bio') || '';
        var photo = localStorage.getItem('mh_user_photo');
        
        $('#profile-name').val(name);
        $('#profile-bio').val(bio);
        if (photo) this.updateProfileUI(photo);
    },

    saveProfileData: function() {
        var name = $('#profile-name').val();
        var bio = $('#profile-bio').val();
        
        localStorage.setItem('mh_user_name', name);
        localStorage.setItem('mh_user_bio', bio);
        
        // Update DB if needed, but localStorage is source of truth for UI here
        if (window.DBHelper) {
            DBHelper.updateSetting('user_name', name);
        }
        
        alert('Profile updated successfully!');
        this.loadPage('settings');
    },

    toggleNotifications: function(enabled) {
        console.log('Notifications toggled:', enabled);
    },

    toggleDarkMode: function(enabled) {
        $('body').toggleClass('dark-mode', enabled);
        localStorage.setItem('mh_dark_mode', enabled);
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

    // Load Dark Mode Preference
    var isDark = localStorage.getItem('mh_dark_mode') === 'true';
    $('body').toggleClass('dark-mode', isDark);
});

// Export to window for global access
window.App = App;
