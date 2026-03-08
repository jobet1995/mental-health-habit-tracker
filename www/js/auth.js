/**
 * auth.js
 * Manages user authentication, session state, and AJAX login/signup requests.
 */

var AuthManager = {

    /**
     * Check if a user is currently logged in.
     * Uses localStorage for persistent session.
     */
    isLoggedIn: function() {
        return localStorage.getItem('mh_session_token') !== null;
    },

    /**
     * Perform login via AJAX.
     * @param {string} email 
     * @param {string} password 
     * @param {function} callback 
     */
    login: function(email, password, callback) {
        var self = this;
        console.log('Attempting login for:', email);

        // Mock AJAX Request
        // In a real app, this would be $.post('/api/login', {email, password})
        setTimeout(function() {
            // Simple mock validation
            if (email && password.length >= 6) {
                var token = 'mock_token_' + Math.random().toString(36).substr(2);
                localStorage.setItem('mh_session_token', token);
                localStorage.setItem('mh_user_name', email.split('@')[0]);
                
                if (callback) callback(true);
            } else {
                if (callback) callback(false, 'Invalid credentials or password too short.');
            }
        }, 800);
    },

    /**
     * Perform signup via AJAX.
     */
    signup: function(name, email, password, callback) {
        var self = this;
        console.log('Attempting signup for:', email);

        // Mock AJAX Request
        setTimeout(function() {
            if (name && email && password.length >= 6) {
                var token = 'mock_token_' + Math.random().toString(36).substr(2);
                localStorage.setItem('mh_session_token', token);
                localStorage.setItem('mh_user_name', name);
                
                if (callback) callback(true);
            } else {
                if (callback) callback(false, 'Please fill all fields correctly.');
            }
        }, 1000);
    },

    /**
     * Logout and clear session.
     */
    logout: function() {
        localStorage.removeItem('mh_session_token');
        localStorage.removeItem('mh_user_name');
        if (window.App) App.loadPage('login');
    }
};

// Export to window
window.AuthManager = AuthManager;
