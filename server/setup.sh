#!/bin/bash

# Chat Application Setup Script

echo "Setting up Chat Application Backend..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate SSL certificates
echo "Generating SSL certificates..."
bash ./generate-certs.sh

# Check if .env file exists, create if not
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOL
PORT=3000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=$(openssl rand -hex 32)
SSL_KEY=./certs/key.pem
SSL_CERT=./certs/cert.pem
EOL
  echo ".env file created with a random JWT secret"
else
  echo ".env file already exists"
fi

echo "Setup completed successfully!"
echo "To start the server in development mode, run: npm run dev"
echo "To start with Docker, run: docker-compose up" 