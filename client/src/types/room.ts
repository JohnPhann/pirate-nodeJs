export interface Room {
  _id: string;
  name: string;
  isGroup: boolean;
  members: RoomMember[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomMember {
  _id: string;
  username: string;
} 