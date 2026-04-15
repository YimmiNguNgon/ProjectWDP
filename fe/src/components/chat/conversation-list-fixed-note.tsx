import { useMessage, type Conversation } from "@/hooks/use-message";
import api from "@/lib/axios";
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Archive, Inbox, MailOpen, Search, Trash, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import socket from "@/lib/socket";
import { toast } from "sonner";

// NOTE:
// File nay la ban da sua de tham khao.
// File goc conversation-list.tsx da duoc tra ve trang thai ban dau.
// Cac thay doi chinh:
// 1. Bo `any` bang type `ConversationWithUnread`.
// 2. Bo `console.log`, thay `alert` bang `toast.error`.
// 3. Tach UI thanh component con de giam do dai component chinh.
// 4. Tach logic thanh helper/hook nho de het loi eslint cua file nay.

type ConversationWithUnread = Conversation & {
  unreadCount?: number;
};

// Da them helper nay de tranh lap logic va bo `any` khi dedupe participants.
function getParticipantKey(conversation: Conversation) {
  return conversation.participants.map((participant) => participant._id).sort().join(",");
}

// Da tach helper lay ten participant khac user hien tai.
function getOtherParticipantName(
  conversation: Conversation,
  userId?: string,
) {
  return (
    conversation.participants.find((participant) => participant._id !== userId)?.username ||
    "Unknown"
  );
}

// Da tach toolbar ra khoi component chinh de giam max-lines-per-function.
function ConversationToolbar({
  search,
  onSearchChange,
  selectedCount,
  allSelected,
  onToggleAll,
  onDelete,
  onMarkAsRead,
  onMoveToInbox,
  onArchive,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onDelete: () => void;
  onMarkAsRead: () => void;
  onMoveToInbox: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="p-4 border-b space-y-4">
      <InputGroup className="bg-muted">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search all memebers messages"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
          <InputGroupAddon align={"inline-end"}>
            <Button
              variant={"ghost"}
              size={"icon-sm"}
              onClick={() => onSearchChange("")}
            >
              <X />
            </Button>
          </InputGroupAddon>
        )}
      </InputGroup>
      <div className="flex items-center gap-2">
        <Checkbox
          className="w-5 h-5 rounded-sm"
          onCheckedChange={(checked) => onToggleAll(!!checked)}
          checked={allSelected}
        />
        <div className="mx-auto" />
        <Button variant={"secondary"} size={"icon-sm"} disabled={!selectedCount} onClick={onDelete}>
          <Trash />
        </Button>
        <Button variant={"secondary"} size={"icon-sm"} disabled={!selectedCount} onClick={onMarkAsRead}>
          <MailOpen />
        </Button>
        <Button variant={"secondary"} size={"icon-sm"} disabled={!selectedCount} onClick={onMoveToInbox}>
          <Inbox />
        </Button>
        <Button variant={"secondary"} size={"icon-sm"} disabled={!selectedCount} onClick={onArchive}>
          <Archive />
        </Button>
      </div>
    </div>
  );
}

// Da tach row tung conversation ra file/component con de de doc hon.
function ConversationRow({
  conversation,
  isSelected,
  currentUserId,
  onToggleSelected,
  onOpenConversation,
}: {
  conversation: ConversationWithUnread;
  isSelected: boolean;
  currentUserId?: string;
  onToggleSelected: (checked: boolean, conversationId: string) => void;
  onOpenConversation: (conversation: ConversationWithUnread) => void;
}) {
  const unreadCount = conversation.unreadCount ?? 0;

  return (
    <Item key={conversation._id}>
      <ItemActions>
        <Checkbox
          className="w-5 h-5 rounded-sm"
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelected(!!checked, conversation._id)}
        />
      </ItemActions>
      <ItemMedia onClick={() => onOpenConversation(conversation)} className="cursor-pointer">
        <div className="aspect-square w-14 bg-muted rounded-full"></div>
      </ItemMedia>
      <ItemContent onClick={() => onOpenConversation(conversation)} className="cursor-pointer">
        <ItemTitle className="capitalize">
          {getOtherParticipantName(conversation, currentUserId)}
        </ItemTitle>
        <ItemDescription>Short Message</ItemDescription>
      </ItemContent>
      <ItemContent onClick={() => onOpenConversation(conversation)} className="cursor-pointer">
        <ItemTitle className="text-end">
          {new Date(conversation.lastMessageAt).toLocaleDateString("en-US")}
        </ItemTitle>
        <ItemDescription className="text-end flex items-center justify-end gap-2">
          <span>
            {new Date(conversation.lastMessageAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function useConversationSync(search: string, currentUserId?: string) {
  const [conversations, setConversations] = React.useState<ConversationWithUnread[]>([]);

  const fetchConversations = React.useCallback(() => {
    api.get("/api/chats/conversations").then((res) => {
      const allConversations = (res.data.data ?? []) as ConversationWithUnread[];

      // Da bo `any` trong doan dedupe bang helper `getParticipantKey`.
      const deduped = allConversations.reduce<ConversationWithUnread[]>(
        (accumulator, conversation) => {
          const participantKey = getParticipantKey(conversation);
          const existingIndex = accumulator.findIndex(
            (item) => getParticipantKey(item) === participantKey,
          );

          if (existingIndex === -1) {
            accumulator.push(conversation);
            return accumulator;
          }

          const existingConversation = accumulator[existingIndex];
          if (
            new Date(conversation.lastMessageAt) >
            new Date(existingConversation.lastMessageAt)
          ) {
            accumulator[existingIndex] = conversation;
          }

          return accumulator;
        },
        [],
      );

      setConversations(deduped);
    });
  }, []);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  React.useEffect(() => {
    const handleReadUpdate = () => {
      fetchConversations();
    };

    const handleNewMessage = () => {
      fetchConversations();
    };

    socket.on("conversation_read", handleReadUpdate);
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("conversation_read", handleReadUpdate);
      socket.off("new_message", handleNewMessage);
    };
  }, [fetchConversations]);

  const filtered = !search
    ? conversations
    : conversations.filter((conversation) =>
        getOtherParticipantName(conversation, currentUserId)
          .toLowerCase()
          .includes(search.toLowerCase()),
      );

  return {
    conversations,
    setConversations,
    filtered,
  };
}

function useConversationSelection(conversations: ConversationWithUnread[]) {
  const [selected, setSelected] = React.useState<string[]>([]);

  const resetSelection = () => setSelected([]);

  const handleCheckedAll = (checked: boolean) => {
    if (checked) {
      setSelected(conversations.map((conversation) => conversation._id));
      return;
    }

    resetSelection();
  };

  const handleCheckedChange = (checked: boolean, conversationId: string) => {
    if (checked) {
      setSelected((prev) => [...prev, conversationId]);
      return;
    }

    setSelected((prev) => prev.filter((id) => id !== conversationId));
  };

  return { selected, resetSelection, handleCheckedAll, handleCheckedChange };
}

function useConversationActions({
  conversations,
  setConversations,
}: {
  conversations: ConversationWithUnread[];
  setConversations: React.Dispatch<React.SetStateAction<ConversationWithUnread[]>>;
}) {
  const { setParticipants, conversation: activeConv, setConversation } = useMessage();
  const { selected, resetSelection, handleCheckedAll, handleCheckedChange } =
    useConversationSelection(conversations);

  // Da tao helper chung de giam lap code cho mark-read, inbox, archive.
  const runConversationRequest = async (
    action: (conversationId: string) => Promise<unknown>,
    errorMessage: string,
  ) => {
    try {
      await Promise.all(selected.map((conversationId) => action(conversationId)));
      return true;
    } catch (error) {
      // Da giu lai console.error vi rule no-console cho phep error/warn.
      console.error(errorMessage, error);
      // Da thay alert bang toast.error o day.
      toast.error(errorMessage);
      return false;
    }
  };

  const handleConversationClick = (conversation: ConversationWithUnread) => {
    setParticipants(conversation.participants.map((participant) => participant._id));
    setConversations((prev) =>
      prev.map((item) =>
        item._id === conversation._id ? { ...item, unreadCount: 0 } : item,
      ),
    );
  };

  const handleDeleteConversation = async () => {
    if (selected.length === 0) return;

    try {
      await Promise.all(
        selected.map((conversationId) =>
          api.delete(`/api/chats/conversations/${conversationId}`),
        ),
      );

      setConversations((prev) =>
        prev.filter((conversation) => !selected.includes(conversation._id)),
      );

      if (activeConv && selected.includes(activeConv._id)) {
        setParticipants([]);
        setConversation(undefined);
      }

      resetSelection();
    } catch (error) {
      console.error("[ConversationList] Failed to delete conversations:", error);
      toast.error("Unable to delete conversation. Please try again.");
    }
  };

  const handleMarkAsReadConversation = async () => {
    if (selected.length === 0) return;

    const success = await runConversationRequest(
      (conversationId) => api.post(`/api/chats/conversations/${conversationId}/read`),
      "Unable to mark as read. Please try again.",
    );

    if (success) {
      resetSelection();
    }
  };

  const handleAddToInboxConversation = async () => {
    if (selected.length === 0) return;

    const success = await runConversationRequest(
      (conversationId) => api.post(`/api/chats/conversations/${conversationId}/inbox`),
      "Unable to move to inbox. Please try again.",
    );

    if (success) {
      resetSelection();
    }
  };

  const handleArchiveConversation = async () => {
    if (selected.length === 0) return;

    const success = await runConversationRequest(
      (conversationId) => api.post(`/api/chats/conversations/${conversationId}/archive`),
      "Unable to archive conversation. Please try again.",
    );

    if (success) {
      setConversations((prev) =>
        prev.filter((conversation) => !selected.includes(conversation._id)),
      );
      resetSelection();
    }
  };

  return {
    selected,
    handleCheckedAll,
    handleCheckedChange,
    handleConversationClick,
    handleDeleteConversation,
    handleMarkAsReadConversation,
    handleAddToInboxConversation,
    handleArchiveConversation,
  };
}

function useConversationListState() {
  const { payload } = useAuth();
  const [search, setSearch] = React.useState("");
  const { conversations, setConversations, filtered } = useConversationSync(
    search,
    payload?.userId,
  );
  const {
    selected,
    handleCheckedAll,
    handleCheckedChange,
    handleConversationClick,
    handleDeleteConversation,
    handleMarkAsReadConversation,
    handleAddToInboxConversation,
    handleArchiveConversation,
  } = useConversationActions({
    conversations,
    setConversations,
  });

  return {
    payload,
    search,
    setSearch,
    conversations,
    selected,
    filtered,
    handleCheckedAll,
    handleCheckedChange,
    handleConversationClick,
    handleDeleteConversation,
    handleMarkAsReadConversation,
    handleAddToInboxConversation,
    handleArchiveConversation,
  };
}

export default function ConversationListFixedNote() {
  const {
    payload,
    search,
    setSearch,
    conversations,
    selected,
    filtered,
    handleCheckedAll,
    handleCheckedChange,
    handleConversationClick,
    handleDeleteConversation,
    handleMarkAsReadConversation,
    handleAddToInboxConversation,
    handleArchiveConversation,
  } = useConversationListState();

  return (
    <>
      <ConversationToolbar
        search={search}
        onSearchChange={setSearch}
        selectedCount={selected.length}
        allSelected={
          selected.length === conversations.length && conversations.length > 0
        }
        onToggleAll={handleCheckedAll}
        onDelete={handleDeleteConversation}
        onMarkAsRead={handleMarkAsReadConversation}
        onMoveToInbox={handleAddToInboxConversation}
        onArchive={handleArchiveConversation}
      />
      <ScrollArea className="overflow-auto h-full">
        {filtered.map((conversation) => (
          <ConversationRow
            key={conversation._id}
            conversation={conversation}
            isSelected={selected.includes(conversation._id)}
            currentUserId={payload?.userId}
            onToggleSelected={handleCheckedChange}
            onOpenConversation={handleConversationClick}
          />
        ))}
        <ScrollBar />
      </ScrollArea>
    </>
  );
}
