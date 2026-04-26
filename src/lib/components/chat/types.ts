// src/lib/components/chat/types.ts

export type MessageType = 'TEXT' | 'PHOTO' | 'FILE' | 'SYSTEM'

export interface ChatUser {
  id: string
  name: string
  username: string | null
  avatar: string | null
  isVerified: boolean
}

export interface ChatMessage {
  id: string
  type: MessageType
  text: string
  attachmentUrl: string | null
  attachmentMimeType: string | null
  attachmentSize: number | null
  attachmentName: string | null
  isRead: boolean
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  senderId: string
  replyToId: string | null
  replyTo: {
    id: string
    text: string
    senderId: string
    type: MessageType
  } | null
}

export interface ChatPreview {
  id: string
  /** Інший учасник (для DM-чатів — single peer) */
  peer: ChatUser
  lastMessageText: string | null
  lastMessageAt: string | null
  lastSenderId: string | null
  unreadCount: number
  updatedAt: string
}

export interface ChatDetails {
  id: string
  peer: ChatUser
  members: ChatUser[]
  myLastReadAt: string | null
  mutedUntil: string | null
}

// ─── Pusher payloads ───

export interface MessageNewPayload {
  message: ChatMessage
  chatId: string
  senderName: string
  senderAvatar: string | null
}

export interface MessageEditPayload {
  messageId: string
  chatId: string
  text: string
  editedAt: string
}

export interface MessageDeletePayload {
  messageId: string
  chatId: string
}

export interface MessageReadPayload {
  chatId: string
  readerId: string
  lastReadAt: string
}

export interface ChatUpdatePayload {
  chatId: string
  lastMessageText: string
  lastMessageAt: string
  lastSenderId: string
  unreadCount: number
}

export interface TypingPayload {
  userId: string
  userName: string
}
