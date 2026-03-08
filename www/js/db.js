var db = null;

var DBHelper = {
    /**
     * Initialize the database and create tables if they do not exist.
     */
    initDB: function() {
        var self = this;
        
        if (window.sqlitePlugin) {
            console.log('Using Cordova SQLite Plugin');
            db = window.sqlitePlugin.openDatabase({
                name: 'mindhabit.db',
                location: 'default'
            });
        } else if (window.openDatabase) {
            console.log('Using WebSQL Fallback (Electron/Browser)');
            db = window.openDatabase('mindhabit.db', '1.0', 'MindHabit DB', 5 * 1024 * 1024);
        } else {
            console.error('No supported database found (SQLite or WebSQL).');
            return;
        }

        if (db) {
            db.transaction(function(tx) {
                // Create habits table
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS habits (' +
                    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
                    'name TEXT NOT NULL, ' +
                    'category TEXT, ' +
                    'frequency TEXT, ' +
                    'streak INTEGER DEFAULT 0, ' +
                    'last_completed_date TEXT, ' +
                    'created_at TEXT, ' +
                    'updated_at TEXT)'
                );

                // Create mood_logs table
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS mood_logs (' +
                    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
                    'mood_level INTEGER, ' +
                    'mood_label TEXT, ' +
                    'notes TEXT, ' +
                    'date TEXT UNIQUE, ' +
                    'created_at TEXT, ' +
                    'updated_at TEXT)'
                );

                // Create settings table
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS settings (' +
                    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
                    'key TEXT UNIQUE, ' +
                    'value TEXT, ' +
                    'updated_at TEXT)'
                );
            }, function(error) {
                console.error('Error initializing database: ' + (error.message || error));
            }, function() {
                console.log('Database initialized successfully.');
            });
        }
    },

    /**
     * Add a new habit to the database.
     * @param {Object} habitObj - e.g., {name: 'Read', category: 'mental', frequency: 'daily'}
     * @param {Function} successCallback
     * @param {Function} errorCallback
     */
    addHabit: function(habitObj, successCallback, errorCallback) {
        if (!db) return console.error('Database not initialized');
        var now = new Date().toISOString();
        db.transaction(function(tx) {
            var query = 'INSERT INTO habits (name, category, frequency, streak, last_completed_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)';
            tx.executeSql(query, [habitObj.name, habitObj.category, habitObj.frequency, 0, null, now, now], 
            function(res) {
                if (successCallback) successCallback(res);
            }, 
            function(error) {
                if (errorCallback) errorCallback(error);
                else console.error('Error adding habit: ' + error.message);
            });
        });
    },

    /**
     * Update an existing habit.
     * @param {Number} id - the habit ID
     * @param {Object} habitObj - object containing fields to update and their new values
     * @param {Function} successCallback
     * @param {Function} errorCallback
     */
    updateHabit: function(id, habitObj, successCallback, errorCallback) {
        var now = new Date().toISOString();
        var setClauses = [];
        var params = [];
        for (var key in habitObj) {
            setClauses.push(key + ' = ?');
            params.push(habitObj[key]);
        }
        setClauses.push('updated_at = ?');
        params.push(now);
        params.push(id);

        db.transaction(function(tx) {
            var query = 'UPDATE habits SET ' + setClauses.join(', ') + ' WHERE id = ?';
            tx.executeSql(query, params, 
            function(tx, res) {
                if (successCallback) successCallback(res);
            }, 
            function(tx, error) {
                if (errorCallback) errorCallback(error);
                else console.error('Error updating habit: ' + error.message);
            });
        });
    },

    /**
     * Delete a habit from the database.
     * @param {Number} id - the habit ID
     * @param {Function} successCallback
     * @param {Function} errorCallback
     */
    deleteHabit: function(id, successCallback, errorCallback) {
        db.transaction(function(tx) {
            var query = 'DELETE FROM habits WHERE id = ?';
            tx.executeSql(query, [id], 
            function(tx, res) {
                if (successCallback) successCallback(res);
            }, 
            function(tx, error) {
                if (errorCallback) errorCallback(error);
                else console.error('Error deleting habit: ' + error.message);
            });
        });
    },

    /**
     * Retrieve all habits.
     * @param {Function} callback - returns an array of habits
     */
    getHabits: function(callback) {
        if (!db) {
            setTimeout(() => this.getHabits(callback), 100);
            return;
        }
        db.transaction(function(tx) {
            var query = 'SELECT * FROM habits';
            tx.executeSql(query, [], function(tx, rs) {
                var habits = [];
                for (var i = 0; i < rs.rows.length; i++) {
                    habits.push(rs.rows.item(i));
                }
                if (callback) callback(habits);
            }, function(tx, error) {
                console.error('Error getting habits: ' + error.message);
            });
        });
    },

    /**
     * Retrieve a single habit by ID.
     * @param {Number} id
     * @param {Function} callback - returns the habit object or null
     */
    getHabitById: function(id, callback) {
        db.transaction(function(tx) {
            var query = 'SELECT * FROM habits WHERE id = ?';
            tx.executeSql(query, [id], function(tx, rs) {
                if (rs.rows.length > 0) {
                    if (callback) callback(rs.rows.item(0));
                } else {
                    if (callback) callback(null);
                }
            }, function(tx, error) {
                console.error('Error getting habit by ID: ' + error.message);
            });
        });
    },

    /**
     * Add a new mood log.
     * @param {Object} moodObj - e.g., {mood_level: 4, mood_label: 'happy', notes: 'Feeling good', date: '2023-10-01'}
     * @param {Function} successCallback
     * @param {Function} errorCallback
     */
    addMoodLog: function(moodObj, successCallback, errorCallback) {
        var now = new Date().toISOString();
        db.transaction(function(tx) {
            var query = 'INSERT INTO mood_logs (mood_level, mood_label, notes, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)';
            tx.executeSql(query, [moodObj.mood_level, moodObj.mood_label, moodObj.notes, moodObj.date, now, now], 
            function(tx, res) {
                if (successCallback) successCallback(res);
            }, 
            function(tx, error) {
                if (errorCallback) errorCallback(error);
                else console.error('Error adding mood log: ' + error.message);
            });
        });
    },

    /**
     * Retrieve mood log for a specific date.
     * @param {String} date - ISO date string (YYYY-MM-DD)
     * @param {Function} callback - returns the mood object or null
     */
    getMoodByDate: function(date, callback) {
        db.transaction(function(tx) {
            var query = 'SELECT * FROM mood_logs WHERE date = ?';
            tx.executeSql(query, [date], function(tx, rs) {
                if (rs.rows.length > 0) {
                    if (callback) callback(rs.rows.item(0));
                } else {
                    if (callback) callback(null);
                }
            }, function(tx, error) {
                console.error('Error getting mood by date: ' + error.message);
            });
        });
    },

    /**
     * Retrieve all mood logs.
     * @param {Function} callback - returns an array of mood logs
     */
    getMoodLogs: function(callback) {
        if (!db) {
            setTimeout(() => this.getMoodLogs(callback), 100);
            return;
        }
        db.transaction(function(tx) {
            var query = 'SELECT * FROM mood_logs ORDER BY date DESC, created_at DESC';
            tx.executeSql(query, [], function(tx, rs) {
                var logs = [];
                for (var i = 0; i < rs.rows.length; i++) {
                    logs.push(rs.rows.item(i));
                }
                if (callback) callback(logs);
            }, function(tx, error) {
                console.error('Error getting mood logs: ' + error.message);
            });
        });
    },

    /**
     * Save or update an app setting.
     * @param {String} key - setting key
     * @param {String} value - setting value
     * @param {Function} successCallback
     * @param {Function} errorCallback
     */
    updateSetting: function(key, value, successCallback, errorCallback) {
        var now = new Date().toISOString();
        db.transaction(function(tx) {
            // Using INSERT OR REPLACE to ensure compatibility with SQLite versions
            var query = 'INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES ((SELECT id FROM settings WHERE key = ?), ?, ?, ?)';
            tx.executeSql(query, [key, key, value, now], 
            function(tx, res) {
                if (successCallback) successCallback(res);
            }, 
            function(tx, error) {
                if (errorCallback) errorCallback(error);
                else console.error('Error updating setting: ' + error.message);
            });
        });
    },

    /**
     * Retrieve a setting value.
     * @param {String} key - setting key
     * @param {Function} callback - returns the setting value or null if not found
     */
    getSetting: function(key, callback) {
        if (!db) {
            setTimeout(() => this.getSetting(key, callback), 100);
            return;
        }
        db.transaction(function(tx) {
            var query = 'SELECT value FROM settings WHERE key = ?';
            tx.executeSql(query, [key], function(tx, rs) {
                if (rs.rows.length > 0) {
                    if (callback) callback(rs.rows.item(0).value);
                } else {
                    if (callback) callback(null);
                }
            }, function(tx, error) {
                console.error('Error getting setting: ' + error.message);
            });
        });
    }
};

// Export or attach to window depending on project scaling structure
window.DBHelper = DBHelper;
