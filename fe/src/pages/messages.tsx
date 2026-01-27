import { Messages } from '@/components/chat/messages';
import ConversationList from '@/components/chat/conversation-list';
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Link } from 'react-router-dom';
import {
  MessageContext,
  type Conversation,
  type Message,
  type MessageContextValue,
} from '@/hooks/use-message';
import React from 'react';
import api from '@/lib/axios';
import type { ProductDetail } from './product-detail';

export function MessagesProvider({ children }: React.PropsWithChildren) {
  const [participants, setParticipants] = React.useState<string[]>();
  const [conversation, setConversation] = React.useState<Conversation>();
  const [messages, setMessages] = React.useState<Message[]>();
  const [productRef, setProductRef] = React.useState<string>();
  const [product, setProduct] = React.useState<ProductDetail>();

  React.useEffect(() => {
    if (!participants) return;
    api
      .post('/api/v1/chats/conversations', {
        participants,
      })
      .then((res) => {
        setConversation(res.data.data);
      });
  }, [participants]);

  React.useEffect(() => {
    if (!conversation) return;
    api
      .get(`/api/v1/chats/conversations/${conversation._id}/messages`)
      .then((res) => {
        setMessages(res.data.data);
      });
  }, [conversation]);

  React.useEffect(() => {
    if (!productRef) {
      setProduct(undefined);
    } else {
      api.get(`/api/v1/products/${productRef}`).then((res) => {
        setProduct(res.data.data);
      });
    }
  }, [productRef]);

  const value: MessageContextValue = {
    participants,
    setParticipants,
    conversation,
    setConversation,
    messages,
    setMessages,
    productRef,
    setProductRef,
    product,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}

export default function MessagesPage() {
  return (
    <>
      <SidebarProvider className='gap-2 min-h-fit h-186'>
        <Sidebar
          variant='inset'
          collapsible='none'
          className='bg-muted border-border border rounded-2xl w-fit p-4 h-full'
        >
          <MessagesSidebarContent />
        </Sidebar>
        <SidebarInset>
          <SidebarProvider className='gap-2 min-h-fit h-full'>
            <Sidebar
              variant='inset'
              collapsible='none'
              className='min-w-fit bg-transparent rounded-2xl border'
            >
              <ConversationList />
            </Sidebar>
            <SidebarInset className='border rounded-2xl overflow-hidden'>
              <Messages />
            </SidebarInset>
          </SidebarProvider>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

const MESSAGES_SIDEBAR_ITEMS = [
  { name: 'Inbox', to: '#' },
  { name: 'From members', to: '#' },
  { name: 'Unread from members', to: '#' },
  { name: 'From eBay', to: '#' },
  { name: 'Unread from eBay', to: '#' },
  { name: 'Deleted', to: '#' },
  { name: 'Archive', to: '#' },
];

function MessagesSidebarContent() {
  return (
    <SidebarContent className='h-full'>
      <SidebarMenu className='h-full'>
        {MESSAGES_SIDEBAR_ITEMS.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild className='px-0 py-4 pe-8 h-fit'>
              <Link to={item.to}>{item.name}</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarContent>
  );
}
