// Test environment configuration
module.exports = {
  port: 3004,
  mongoUri: 'mongodb://localhost:27017/chatapp_test',
  jwtSecret: 'test_jwt_secret',
  sslKeyPath: null, // No SSL in test
  sslCertPath: null
}; 