const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'warnings.json');

// Helper to read database safely
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return {};
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error('❌ Database read error:', error);
    return {};
  }
}

// Helper to write database safely
function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Database write error:', error);
    return false;
  }
}

/**
 * Warns a user by ID
 * @param {string} userId 
 * @param {string} username 
 * @param {string} moderator 
 * @param {string} reason 
 * @returns {Array} List of all warnings for this user
 */
function warnUser(userId, username, moderator, reason) {
  const db = readDb();
  
  if (!db[userId]) {
    db[userId] = {
      username: username,
      warnings: []
    };
  }
  
  // Update username if it changed
  db[userId].username = username;
  
  const newWarning = {
    moderator: moderator,
    reason: reason,
    timestamp: new Date().toISOString()
  };
  
  db[userId].warnings.push(newWarning);
  writeDb(db);
  
  return db[userId].warnings;
}

/**
 * Gets warnings for a user by ID
 * @param {string} userId 
 * @returns {Array} Warnings list
 */
function getWarnings(userId) {
  const db = readDb();
  return db[userId] ? db[userId].warnings : [];
}

/**
 * Clears warnings for a user
 * @param {string} userId 
 * @returns {boolean} Success state
 */
function clearWarnings(userId) {
  const db = readDb();
  if (db[userId]) {
    delete db[userId];
    writeDb(db);
    return true;
  }
  return false;
}

module.exports = {
  warnUser,
  getWarnings,
  clearWarnings
};
