# Message Reactions Feature Documentation

## Overview
The Message Reactions feature allows users to react to messages in chat rooms using emojis. Users can add, remove, and view reactions in real-time.

## Database Schema

### MessageReaction Model
```typescript
interface IMessageReaction {
  messageId: mongoose.Types.ObjectId;  // Reference to the message
  userId: mongoose.Types.ObjectId;     // Reference to the user who reacted
  reaction: string;                    // The emoji reaction
  createdAt: Date;                     // When the reaction was added
  updatedAt: Date;                     // When the reaction was last updated
}
```

## API Endpoints

### 1. Add Reaction
```http
POST /api/reactions
```

**Request Body:**
```json
{
  "messageId": "message_id_here",
  "reaction": "👍"
}
```

**Response:**
```json
{
  "_id": "reaction_id",
  "messageId": "message_id_here",
  "userId": {
    "_id": "user_id",
    "username": "username"
  },
  "reaction": "👍",
  "createdAt": "2024-05-04T00:00:00.000Z",
  "updatedAt": "2024-05-04T00:00:00.000Z"
}
```

### 2. Get Message Reactions
```http
GET /api/reactions/message/:messageId
```

**Response:**
```json
[
  {
    "_id": "reaction_id",
    "messageId": "message_id_here",
    "userId": {
      "_id": "user_id",
      "username": "username"
    },
    "reaction": "👍",
    "createdAt": "2024-05-04T00:00:00.000Z",
    "updatedAt": "2024-05-04T00:00:00.000Z"
  }
]
```

### 3. Remove Reaction
```http
DELETE /api/reactions/:reactionId
```

**Response:**
```json
{
  "message": "Reaction removed"
}
```

## Socket Events

### 1. Reaction Added
```typescript
socket.emit('reaction_added', {
  _id: string;
  messageId: string;
  userId: {
    _id: string;
    username: string;
  };
  reaction: string;
  createdAt: Date;
  updatedAt: Date;
});
```

### 2. Reaction Removed
```typescript
socket.emit('reaction_removed', {
  messageId: string;
  userId: string;
  reaction: string;
});
```

## Features

1. **Real-time Updates**
   - Reactions are updated in real-time for all users in the room
   - No page refresh required

2. **Duplicate Prevention**
   - Users can't add the same reaction twice
   - Clicking the same reaction again removes it

3. **User-specific Reactions**
   - Each user can have their own reactions
   - Users can only remove their own reactions

4. **Reaction Types**
   - Supports any emoji as a reaction
   - Common reactions include: 👍, ❤️, 😂, 😮, 😢

## Usage Example

```typescript
// Adding a reaction
const addReaction = async (messageId: string, reaction: string) => {
  try {
    const response = await api.post('/api/reactions', {
      messageId,
      reaction
    });
    return response.data;
  } catch (error) {
    console.error('Error adding reaction:', error);
  }
};

// Getting reactions for a message
const getReactions = async (messageId: string) => {
  try {
    const response = await api.get(`/api/reactions/message/${messageId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting reactions:', error);
  }
};

// Removing a reaction
const removeReaction = async (reactionId: string) => {
  try {
    const response = await api.delete(`/api/reactions/${reactionId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing reaction:', error);
  }
};
```

## Error Handling

1. **Unauthorized (401)**
   - User is not logged in
   - Invalid authentication token

2. **Forbidden (403)**
   - User trying to remove someone else's reaction

3. **Not Found (404)**
   - Reaction doesn't exist
   - Message doesn't exist

4. **Server Error (500)**
   - Database connection issues
   - Server-side errors

## Best Practices

1. **Rate Limiting**
   - Implement rate limiting for reaction actions
   - Prevent spam reactions

2. **Caching**
   - Cache reactions for frequently accessed messages
   - Reduce database load

3. **Validation**
   - Validate reaction emojis
   - Sanitize user input

4. **Performance**
   - Use indexes for efficient queries
   - Optimize real-time updates

## Security Considerations

1. **Authentication**
   - All endpoints require authentication
   - Validate user permissions

2. **Input Validation**
   - Validate reaction strings
   - Prevent XSS attacks

3. **Rate Limiting**
   - Prevent abuse of the reaction system
   - Protect against DoS attacks

## Future Enhancements

1. **Reaction Categories**
   - Group reactions by type
   - Add custom reaction sets

2. **Reaction Analytics**
   - Track most used reactions
   - User reaction patterns

3. **Custom Reactions**
   - Allow custom emoji uploads
   - Support GIF reactions

4. **Reaction Notifications**
   - Notify users of reactions
   - Email/SMS notifications 