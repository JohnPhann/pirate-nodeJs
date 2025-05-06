export interface User {
  _id: string;
  username: string;
  email: string;
}

export interface Message {
  _id: string;
  sender: User;
  content: string;
  room: string;
  createdAt: string;
}

export interface Room {
  _id: string;
  name: string;
  owner: string;
  participants?: User[];
  members?: User[];
  isGroup?: boolean;
  createdAt: string;
  updatedAt?: string;
} 