import type { ProductDetail } from '@/pages/product-detail';
import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';

export interface Member {
  _id: string;
  username: string;
}

export interface Conversation {
  _id: string;
  participants: Member[];
  createdAt: string;
  lastMessageAt: string;
  __v: number;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  text?: string;
  attachments: string[];
  productRef?: ProductDetail;
  readBy: string[];
  createdAt: string;
}

export interface MessageContextValue {
  participants?: string[];
  setParticipants: (participants: string[]) => void;
  conversation?: Conversation;
  setConversation: Dispatch<SetStateAction<Conversation | undefined>>;
  messages?: Message[];
  setMessages: Dispatch<SetStateAction<Message[] | undefined>>;
  productRef?: string;
  setProductRef: Dispatch<SetStateAction<string | undefined>>;
  product?: ProductDetail;
}

export const MessageContext = createContext<MessageContextValue | undefined>(
  undefined
);

export const useMessage = () => {
  const context = useContext(MessageContext);

  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }

  return context;
};
