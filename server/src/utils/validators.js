/**
 * Validation utilities for the application
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} Whether the email is valid
 */
const isValidEmail = (email) => {
  return emailRegex.test(email);
};

/**
 * Validates a username
 * @param {string} username - The username to validate
 * @returns {boolean} Whether the username is valid
 */
const isValidUsername = (username) => {
  return typeof username === 'string' && 
         username.length >= 3 && 
         username.length <= 30 &&
         /^[a-zA-Z0-9_]+$/.test(username);
};

/**
 * Validates a password
 * @param {string} password - The password to validate
 * @returns {boolean} Whether the password is valid
 */
const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

module.exports = {
  isValidEmail,
  isValidUsername,
  isValidPassword
}; 