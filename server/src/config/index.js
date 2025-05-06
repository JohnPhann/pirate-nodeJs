const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 3004,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  sslKeyPath: process.env.SSL_KEY,
  sslCertPath: process.env.SSL_CERT,
}; 