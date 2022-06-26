export type ChannelMessage =
  | RoomTextChannelMessage
  | RoomIsTypingChannelMessage
  | RoomParticipantChannelMessage
  | RoomVoteChannelMessage
  | RoomInitializeChannelMessage;

export interface RoomTextChannelMessage extends MessageView {
  kind: "text";
}

export interface RoomIsTypingChannelMessage {
  kind: "isTyping";
  from: UserView;
}

export interface RoomParticipantChannelMessage {
  kind: "participant";
  from: UserView;
}
export interface RoomVoteChannelMessage {
  kind: "vote";
  result: boolean;
  from: UserView;
}
export interface RoomInitializeChannelMessage {
  kind: "initialize";
}

export interface UserView {
  name: string;
  avatarUrl: string;
}

export interface MessageView {
  message: string;
  from: UserView;
  createdAt: string;
}

export interface RoomView {
  username: number;
  roomId: number;
  name: string;
  lastMessageAt: string;
  participants: { [userId: number]: boolean };
}

export type ApiSendMessage =
  | ApiVoteMessage
  | ApiParticipantMessage
  | ApiInitializeMessage;

export interface ApiVoteMessage {
  kind: "vote";
  roomId: number;
  result: boolean;
}

export interface ApiParticipantMessage {
  kind: "participant";
  roomId: number;
}

export interface ApiInitializeMessage {
  kind: "initialize";
  roomId: number;
}
