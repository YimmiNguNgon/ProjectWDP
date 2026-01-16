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

export default function ConversationList() {
  const { setParticipants } = useMessage();
  const [search, setSearch] = React.useState('');
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const { payload } = useAuth();
  const [filtered, setFiltered] = React.useState<Conversation[]>([]);

  React.useEffect(() => {
    api.get('/api/v1/chats/conversations').then((res) => {
      setConversations(res.data.data);
      setFiltered(res.data.data);
    });
  }, []);

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

  const handleDeleteConversation = () => {
    // TODO: handleDeleteConversation
  };

  const handleMarkAsReadConversation = () => {
    // TODO: handleMarkAsReadConversation
  };

  const handleAddToInboxConversation = () => {
    // TODO: handleAddToInboxConversation
  };

  const handleArchiveConversation = () => {
    // TODO: handleArchiveConversation
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
              onClick={() =>
                setParticipants(conversation.participants.map((p) => p._id))
              }
              className='cursor-pointer'
            >
              <div className='aspect-square w-14 bg-muted rounded-full'></div>
            </ItemMedia>
            <ItemContent
              onClick={() =>
                setParticipants(conversation.participants.map((p) => p._id))
              }
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
              onClick={() =>
                setParticipants(conversation.participants.map((p) => p._id))
              }
              className='cursor-pointer'
            >
              <ItemTitle className='text-end'>
                {new Date(conversation.lastMessageAt).toLocaleDateString(
                  'vi-VN'
                )}
              </ItemTitle>
              <ItemDescription className='text-end'>
                {new Date(conversation.lastMessageAt).toLocaleTimeString(
                  'vi-VN',
                  { hour: '2-digit', minute: '2-digit', hour12: false }
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
