/**
 * utils.js
 * Reusable helper functions for MindHabit application.
 * Exported through a global object named Utils.
 */

var Utils = {

    // ==========================================
    // Section 1: Date Utilities
    // ==========================================

    /**
     * Return today's date formatted as YYYY-MM-DD.
     * @returns {string}
     */
    getCurrentDate: function() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Return a full timestamp in ISO format.
     * @returns {string}
     */
    getCurrentTimestamp: function() {
        return new Date().toISOString();
    },

    /**
     * Convert a raw date into a human-readable format.
     * Example: "2026-03-08" -> "March 8, 2026"
     * @param {string|Date} date 
     * @returns {string}
     */
    formatDate: function(date) {
        if (!date) return "";
        var d = new Date(date);
        var options = { year: 'numeric', month: 'long', day: 'numeric' };
        return d.toLocaleDateString('en-US', options);
    },

    /**
     * Convert a raw date into a human-readable time.
     * Example: "2026-03-08T14:30:00Z" -> "2:30 PM"
     * @param {string|Date} date 
     * @returns {string}
     */
    formatTime: function(date) {
        if (!date) return "";
        var d = new Date(date);
        var options = { hour: 'numeric', minute: '2-digit', hour12: true };
        return d.toLocaleTimeString('en-US', options);
    },

    /**
     * Return the previous day's date as YYYY-MM-DD.
     * @returns {string}
     */
    getYesterdayDate: function() {
        var d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    },

    /**
     * Calculate number of days between two dates.
     * @param {string|Date} date1 
     * @param {string|Date} date2 
     * @returns {number}
     */
    daysBetween: function(date1, date2) {
        var d1 = new Date(date1);
        var d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        var diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Check if a given date is today.
     * @param {string|Date} date 
     * @returns {boolean}
     */
    isToday: function(date) {
        var d = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
        return d === this.getCurrentDate();
    },

    /**
     * Check if a given date is yesterday.
     * @param {string|Date} date 
     * @returns {boolean}
     */
    isYesterday: function(date) {
        var d = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
        return d === this.getYesterdayDate();
    },

    // ==========================================
    // Section 2: Habit Utilities
    // ==========================================

    /**
     * Logic to determine the new streak count.
     * @param {string} lastCompletedDate - ISO string (YYYY-MM-DD).
     * @param {number} currentStreak 
     * @returns {number} New streak count.
     */
    calculateStreak: function(lastCompletedDate, currentStreak) {
        if (!lastCompletedDate) return 1;
        
        if (this.isToday(lastCompletedDate)) {
            return currentStreak;
        } else if (this.isYesterday(lastCompletedDate)) {
            return (currentStreak || 0) + 1;
        } else {
            return 1;
        }
    },

    /**
     * Return percentage completion rate.
     * @param {number} completedDays 
     * @param {number} totalDays 
     * @returns {number}
     */
    getCompletionRate: function(completedDays, totalDays) {
        if (!totalDays || totalDays === 0) return 0;
        return Math.round((completedDays / totalDays) * 100);
    },

    // ==========================================
    // Section 3: Mood Utilities
    // ==========================================

    /**
     * Convert mood level into emoji.
     * @param {number} level 
     * @returns {string}
     */
    getMoodEmoji: function(level) {
        var mapping = {
            1: '😢',
            2: '🙁',
            3: '😐',
            4: '🙂',
            5: '😄'
        };
        return mapping[level] || '❓';
    },

    /**
     * Return color code for mood visualization.
     * @param {number} level 
     * @returns {string}
     */
    getMoodColor: function(level) {
        var mapping = {
            1: '#f44336', // red
            2: '#ff9800', // orange
            3: '#ffeb3b', // yellow
            4: '#8bc34a', // lightgreen
            5: '#4caf50'  // green
        };
        return mapping[level] || '#9e9e9e'; // grey
    },

    // ==========================================
    // Section 4: ID / Random Utilities
    // ==========================================

    /**
     * Generate a unique numeric ID.
     * @returns {number}
     */
    generateUniqueId: function() {
        return Date.now() + Math.floor(Math.random() * 1000);
    },

    /**
     * Return a random integer between two numbers.
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // ==========================================
    // Section 5: Text Utilities
    // ==========================================

    /**
     * Capitalize first letter of a string.
     * @param {string} text 
     * @returns {string}
     */
    capitalizeFirstLetter: function(text) {
        if (!text) return "";
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    /**
     * Trim long notes for display in lists.
     * @param {string} text 
     * @param {number} maxLength 
     * @returns {string}
     */
    truncateText: function(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // ==========================================
    // Section 6: Storage Utilities
    // ==========================================

    /**
     * Store JSON data in local storage.
     * @param {string} key 
     * @param {any} value 
     */
    saveToLocalStorage: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    },

    /**
     * Retrieve and parse stored JSON data.
     * @param {string} key 
     * @returns {any}
     */
    getFromLocalStorage: function(key) {
        try {
            var item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from localStorage', e);
            return null;
        }
    },

    /**
     * Remove stored item.
     * @param {string} key 
     */
    removeFromLocalStorage: function(key) {
        localStorage.removeItem(key);
    },

    // ==========================================
    // Section 7: Validation Utilities
    // ==========================================

    /**
     * Check if string or object is empty.
     * @param {any} value 
     * @returns {boolean}
     */
    isEmpty: function(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    /**
     * Validate date format YYYY-MM-DD.
     * @param {string} date 
     * @returns {boolean}
     */
    isValidDate: function(date) {
        var regEx = /^\d{4}-\d{2}-\d{2}$/;
        if(!date.match(regEx)) return false;  // Invalid format
        var d = new Date(date);
        var dNum = d.getTime();
        if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
        return d.toISOString().slice(0,10) === date;
    }
};

// Export all functions through a global object called "Utils"
window.Utils = Utils;
