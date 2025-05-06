# Chat Application Backend

This is a real-time chat application backend built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- User authentication (register, login, JWT)
- Real-time messaging
- Group chat and direct messages
- User search
- Friend management
- Typing indicators
- Read receipts (coming soon)

## Prerequisites

- Node.js (>=14.x)
- MongoDB
- OpenSSL (for generating SSL certificates)

## Setup

1. Clone the repository and navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Generate SSL certificates (for HTTPS/WSS):

```bash
npm run generate-certs
```

4. Create a `.env` file in the project root with the following variables:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_jwt_secret_here
SSL_KEY=./certs/key.pem
SSL_CERT=./certs/cert.pem
```

## Running the Application

### Development Mode

Start the server in development mode with automatic restarts:

```bash
npm run dev
```

### Production Mode

Start the server in production mode:

```bash
npm start
```

### Using Docker

If you have Docker and Docker Compose installed, you can run the application with:

```bash
docker-compose up
```

This will start both the MongoDB database and the Node.js application.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users/search?q=query` - Search users by username
- `GET /api/users/:userId` - Get user profile
- `POST /api/users/:userId/friend` - Add a friend

### Rooms (Chats)

- `GET /api/rooms` - Get all rooms for current user
- `GET /api/rooms/:roomId` - Get a specific room
- `POST /api/rooms` - Create a new room

### Messages

- `GET /api/messages/:roomId` - Get messages for a room
- `POST /api/messages` - Send a new message

## Socket.IO Events

### Authentication

Connect to Socket.IO with authentication:

```javascript
socket = io('https://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

- `join_room` - Join a specific chat room
- `typing` - Indicate user is typing
- `private_message` - Send a message through the socket
- `new_message` - Receive a new message
- `user_joined` - User joined a room
- `user_typing` - User is typing
- `error` - Error event

## Testing

Run tests with:

```bash
npm test
```

## License

ISC

mkdir -p client/{components,context,pages,styles,types,utils,public}

