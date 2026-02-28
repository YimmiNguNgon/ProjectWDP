import { useMessage, type Conversation } from '@/hooks/use-message';
import api from '@/lib/axios';
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Archive, Inbox, MailOpen, Search, Trash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import socket from '@/lib/socket';

export default function ConversationList() {
  const { setParticipants } = useMessage();
  const [search, setSearch] = React.useState('');
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const { payload } = useAuth();
  const [filtered, setFiltered] = React.useState<Conversation[]>([]);

  const fetchConversations = React.useCallback(() => {
    api.get('/api/chats/conversations').then((res) => {
      const allConversations = res.data.data;

      // Deduplicate conversations by participants
      // Keep only the most recent conversation for each unique set of participants
      const deduped = allConversations.reduce((acc: Conversation[], conv: Conversation) => {
        const participantIds = conv.participants.map((p: any) => p._id).sort().join(',');

        // Check if we already have a conversation with these participants
        const existingIndex = acc.findIndex((c: Conversation) =>
          c.participants.map((p: any) => p._id).sort().join(',') === participantIds
        );

        if (existingIndex === -1) {
          // No existing conversation with these participants, add it
          acc.push(conv);
        } else {
          // Compare lastMessageAt and keep the more recent one
          const existing = acc[existingIndex];
          if (new Date(conv.lastMessageAt) > new Date(existing.lastMessageAt)) {
            acc[existingIndex] = conv;
          }
        }

        return acc;
      }, []);

      console.log('[ConversationList] Deduped conversations:', {
        before: allConversations.length,
        after: deduped.length,
        removed: allConversations.length - deduped.length
      });

      setConversations(deduped);
      setFiltered(deduped);
    });
  }, []);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen for read status updates
  React.useEffect(() => {
    const handleReadUpdate = () => {
      fetchConversations(); // Refresh to update unread counts
    };

    socket.on('conversation_read', handleReadUpdate);

    return () => {
      socket.off('conversation_read', handleReadUpdate);
    };
  }, [fetchConversations]);

  React.useEffect(() => {
    if (!search) setFiltered(conversations);
    setFiltered(
      conversations.filter((c) =>
        c.participants
          .find((p) => p._id !== payload?.userId)
          ?.username?.toLowerCase()
          .includes(search.toLowerCase())
      )
    );
  }, [search, conversations, payload]);

  const handleCheckedAll = (event: boolean) => {
    if (event) setSelected(conversations.map((c) => c._id));
    else setSelected([]);
  };

  const handleCheckedChange = (event: boolean, conversationId: string) => {
    if (event) setSelected((prev) => [...prev, conversationId]);
    else setSelected((prev) => prev.filter((id) => id !== conversationId));
  };

  const handleConversationClick = (conversation: Conversation) => {
    // Set participants to open conversation
    setParticipants(conversation.participants.map((p) => p._id));

    // Immediately clear unread count in local state for instant feedback
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } as any : c
      )
    );
  };

  const handleDeleteConversation = async () => {
    if (selected.length === 0) return;

    try {
      console.log('[ConversationList] Deleting conversations:', selected);

      // Delete each selected conversation
      const results = await Promise.all(
        selected.map((conversationId) =>
          api.delete(`/api/chats/conversations/${conversationId}`)
        )
      );

      console.log('[ConversationList] Delete results:', results);

      // Update local state by removing deleted conversations
      setConversations((prev) =>
        prev.filter((c) => !selected.includes(c._id))
      );
      setSelected([]);

      console.log('[ConversationList] Conversations deleted successfully');
    } catch (error) {
      console.error('[ConversationList] Failed to delete conversations:', error);
      alert('Unable to delete conversation. Please try again.');
    }
  };

  const handleMarkAsReadConversation = async () => {
    if (selected.length === 0) return;

    try {
      // Mark each selected conversation as read
      await Promise.all(
        selected.map((conversationId) =>
          api.post(`/api/chats/conversations/${conversationId}/read`)
        )
      );

      setSelected([]);
    } catch (error) {
      console.error('Failed to mark conversations as read:', error);
      alert('Unable to mark as read. Please try again.');
    }
  };

  const handleAddToInboxConversation = async () => {
    if (selected.length === 0) return;

    try {
      // Move each selected conversation to inbox
      await Promise.all(
        selected.map((conversationId) =>
          api.post(`/api/chats/conversations/${conversationId}/inbox`)
        )
      );

      setSelected([]);
    } catch (error) {
      console.error('Failed to move conversations to inbox:', error);
      alert('Unable to move to inbox. Please try again.');
    }
  };

  const handleArchiveConversation = async () => {
    if (selected.length === 0) return;

    try {
      // Archive each selected conversation
      await Promise.all(
        selected.map((conversationId) =>
          api.post(`/api/chats/conversations/${conversationId}/archive`)
        )
      );

      // Remove archived conversations from the list
      setConversations((prev) =>
        prev.filter((c) => !selected.includes(c._id))
      );
      setSelected([]);
    } catch (error) {
      console.error('Failed to archive conversations:', error);
      alert('Unable to archive conversation. Please try again.');
    }
  };

  return (
    <>
      <div className='p-4 border-b space-y-4'>
        <InputGroup className='bg-muted'>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder='Search all memebers messages'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <InputGroupAddon align={'inline-end'}>
              <Button
                variant={'ghost'}
                size={'icon-sm'}
                onClick={() => setSearch('')}
              >
                <X />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>
        <div className='flex items-center gap-2'>
          <Checkbox
            className='w-5 h-5 rounded-sm'
            onCheckedChange={handleCheckedAll}
            checked={
              selected.length === conversations.length &&
              conversations.length > 0
            }
          />
          <div className='mx-auto' />
          <Button
            variant={'secondary'}
            size={'icon-sm'}
            disabled={!selected.length}
            onClick={handleDeleteConversation}
          >
            <Trash />
          </Button>
          <Button
            variant={'secondary'}
            size={'icon-sm'}
            disabled={!selected.length}
            onClick={handleMarkAsReadConversation}
          >
            <MailOpen />
          </Button>
          <Button
            variant={'secondary'}
            size={'icon-sm'}
            disabled={!selected.length}
            onClick={handleAddToInboxConversation}
          >
            <Inbox />
          </Button>
          <Button
            variant={'secondary'}
            size={'icon-sm'}
            disabled={!selected.length}
            onClick={handleArchiveConversation}
          >
            <Archive />
          </Button>
        </div>
      </div>
      <ScrollArea className='overflow-auto h-full'>
        {filtered.map((conversation) => (
          <Item key={conversation._id}>
            <ItemActions>
              <Checkbox
                className='w-5 h-5 rounded-sm'
                checked={selected.includes(conversation._id)}
                onCheckedChange={(event) =>
                  handleCheckedChange(!!event, conversation._id)
                }
              />
            </ItemActions>
            <ItemMedia
              onClick={() => handleConversationClick(conversation)}
              className='cursor-pointer'
            >
              <div className='aspect-square w-14 bg-muted rounded-full'></div>
            </ItemMedia>
            <ItemContent
              onClick={() => handleConversationClick(conversation)}
              className='cursor-pointer'
            >
              <ItemTitle className='capitalize'>
                {conversation.participants.find(
                  (p) => p._id !== payload?.userId
                )?.username || 'Unknown'}
              </ItemTitle>
              <ItemDescription>Short Message</ItemDescription>
            </ItemContent>
            <ItemContent
              onClick={() => handleConversationClick(conversation)}
              className='cursor-pointer'
            >
              <ItemTitle className='text-end'>
                {new Date(conversation.lastMessageAt).toLocaleDateString(
                  'en-US'
                )}
              </ItemTitle>
              <ItemDescription className='text-end flex items-center justify-end gap-2'>
                <span>
                  {new Date(conversation.lastMessageAt).toLocaleTimeString(
                    'en-US',
                    { hour: '2-digit', minute: '2-digit', hour12: false }
                  )}
                </span>
                {(conversation as any).unreadCount > 0 && (
                  <span className='inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-blue-600 rounded-full'>
                    {(conversation as any).unreadCount}
                  </span>
                )}
              </ItemDescription>
            </ItemContent>
          </Item>
        ))}
        <ScrollBar />
      </ScrollArea>
    </>
  );
}

