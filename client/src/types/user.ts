export interface User {
  _id: string;
  username: string;
  email: string;
  joinedRooms?: string[];
  createdAt?: string;
  updatedAt?: string;
} 