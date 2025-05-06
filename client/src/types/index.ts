export interface User {
  _id: string;
  username: string;
  avatar?: string;
  email: string;
}



// Extended message type that includes pending and error states for UI
export interface TempMessage extends Partial<Message> {
  _id: string;
  content: string;
  roomId: string;
  userId: User;
  createdAt: string;
  pending?: boolean;
  error?: boolean;
  retrying?: boolean;
  delivered?: boolean;
  unconfirmed?: boolean;
  timeoutWarning?: boolean;
}

export interface Reaction {
  _id: string;
  messageId: Message;
  userId: User;
  reaction: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  _id: string;
  name: string;
  description?: string;
  members: User[];
  createdAt: string;
  updatedAt: string;
  isGroup: boolean;
  owner: string;
}

export interface ErrorResponse {
  message: string;
  status?: number;
  code?: string;
} 


export type Sender = {
  _id: string;
  username: string;
};

export type Message = {
  _id: string;
  roomId: string;
  senderId: Sender;
  content: string;
  timestamp: string; // ISO date string
  __v?: number;
  reactions: Reaction[];
};