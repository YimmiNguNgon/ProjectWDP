import React, { useEffect, useRef, useState, type ComponentProps } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircleX, SendIcon, X, XIcon, AlertCircle, ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessage, type Message } from '@/hooks/use-message';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/axios';
import socket from '@/lib/socket';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Link } from 'react-router-dom';
import { ChatGuidelines } from './chat-guidelines';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export function Messages({
  className,
  onCloseDialog,
  ...props
}: ComponentProps<'div'> & { onCloseDialog?: () => void }) {
  const {
    messages,
    setMessages,
    conversation,
    setConversation,
    productRef,
    setProductRef,
    product,
    participants,
  } = useMessage();
  const { payload } = useAuth();

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll xuống khi có tin nhắn mới
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    if (viewport) {
      setTimeout(() => {
        viewport.scrollTop = viewport.scrollHeight;
      }, 100);
    }
  }, [messages]);

  // Fetch or create conversation when participants change
  useEffect(() => {
    console.log('[Messages] useEffect triggered:', {
      participants,
      hasConversation: !!conversation,
      loading,
      userId: payload?.userId
    });

    if (!participants || participants.length < 2) {
      console.log('[Messages] No participants or insufficient participants');
      return;
    }
    if (conversation) {
      console.log('[Messages] Conversation already exists');
      return; // Already have conversation
    }
    if (loading) {
      console.log('[Messages] Already loading');
      return; // Already fetching
    }

    // Check if user is authenticated
    if (!payload?.userId) {
      console.error('[Messages] User not authenticated');
      setModerationError('Vui lòng đăng nhập để sử dụng tính năng chat');
      return;
    }

    const fetchOrCreateConversation = async () => {
      try {
        console.log('[Messages] Starting to fetch/create conversation...');
        setLoading(true);

        // Create or get existing conversation
        const response = await api.post('/api/chats/conversations', {
          participants: participants
        });

        console.log('[Messages] Conversation response:', response.data);
        setConversation(response.data.data);

        // Fetch messages for this conversation
        const messagesRes = await api.get(
          `/api/chats/conversations/${response.data.data._id}/messages`
        );
        console.log('[Messages] Messages response:', messagesRes.data);
        setMessages(messagesRes.data.data);

        // Mark all messages as read when conversation is opened
        try {
          await api.post(`/api/chats/conversations/${response.data.data._id}/read`);
          console.log('[Messages] Marked conversation as read');
        } catch (readError) {
          console.error('[Messages] Failed to mark as read:', readError);
        }
      } catch (error: any) {
        console.error('[Messages] Failed to create/fetch conversation:', error);

        if (error.response?.status === 401) {
          setModerationError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          setModerationError('Không thể tạo cuộc trò chuyện. Vui lòng thử lại.');
        }

        setTimeout(() => setModerationError(null), 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateConversation();
  }, [participants, conversation, loading, setConversation, setMessages, payload]);

  // Lắng nghe socket events
  useEffect(() => {
    if (!payload?.userId || !conversation?._id) return;

    const { userId } = payload;
    const conversationId = conversation._id;

    // --- Kết nối socket ---
    if (!socket.connected) socket.connect();

    // Gửi auth ngay khi connect
    const handleConnect = () => {
      socket.emit('auth', { userId });
      socket.emit(
        'join_room',
        { conversationId, userId },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack.ok) console.error('join_room failed:', ack.error);
        }
      );
    };

    socket.on('connect', handleConnect);
    if (socket.connected) handleConnect(); // reconnect case

    // --- Nhận tin nhắn mới ---
    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => [msg, ...prev!]);

      // Show notification if message is from another user
      if (msg.sender !== userId) {
        // Get sender name from conversation participants
        const sender = conversation.participants?.find((p: any) => p._id === msg.sender);
        const senderName = sender?.username || 'Someone';

        toast.info(`💬 Tin nhắn mới từ ${senderName}`, {
          description: msg.text || 'Đã gửi một file',
          duration: 3000,
        });
      }
    };

    socket.on('new_message', handleNewMessage);

    // --- Khi user khác đang gõ ---
    const handleTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId !== conversationId || data.userId === userId)
        return;
      setTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        setTyping(false);
      }, 1000);
    };

    socket.on('user_typing', handleTyping);

    // --- Khi update read status ---
    socket.on(
      'update_read_status',
      ({ messageId, readBy }: { messageId: string; readBy: string[] }) => {
        setMessages((prev) =>
          prev?.map((m) => (m.id === messageId ? { ...m, readBy } : m))
        );
      }
    );

    // --- Khi tin nhắn bị chặn ---
    const handleMessageBlocked = (data: { violations: string[]; reason: string }) => {
      setModerationError(data.reason);
      // Auto-hide error after 8 seconds
      setTimeout(() => setModerationError(null), 8000);
    };

    socket.on('message_blocked', handleMessageBlocked);

    // --- Khi có enforcement action (eBay-style) ---
    const handleEnforcementAction = (data: {
      action: string;
      message: string;
      violationCount: number
    }) => {
      // Show enforcement notification
      const icon = data.action === 'warning' ? '⚠️' :
        data.action === 'restriction' ? '🔒' :
          data.action === 'suspension' ? '🚫' : '🔨';

      setModerationError(`${icon} ${data.message}`);

      // Keep enforcement messages visible longer
      setTimeout(() => setModerationError(null), 15000);
    };

    socket.on('enforcement_action', handleEnforcementAction);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('update_read_status');
      socket.off('message_blocked', handleMessageBlocked);
      socket.off('enforcement_action', handleEnforcementAction);
    };
  }, [payload, conversation, setMessages]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setModerationError('Chỉ chấp nhận file ảnh');
      setTimeout(() => setModerationError(null), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setModerationError('Kích thước ảnh tối đa 5MB');
      setTimeout(() => setModerationError(null), 3000);
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload image to server
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/upload/chat-file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      setModerationError('Không thể upload ảnh. Vui lòng thử lại.');
      setTimeout(() => setModerationError(null), 3000);
      return null;
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    const text = input.trim();
    if ((!text && !selectedImage) || !payload?.userId || !conversation?._id) return;

    // Clear previous errors
    setModerationError(null);
    setUploading(true);

    try {
      // Upload image if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          setUploading(false);
          return;
        }
      }

      const data = {
        conversationId: conversation._id,
        sender: payload.userId,
        text: text || '',
        attachments: imageUrl ? [{ url: imageUrl, type: 'image' }] : [],
        productRef,
      };

      socket.emit('send_message', data, (ack: any) => {
        setUploading(false);
        if (ack?.ok) {
          // Success
          if (productRef) setProductRef(undefined);
          setInput('');
          setSelectedImage(null);
          setImagePreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else if (ack?.error === 'user_restricted') {
          // User is banned/suspended/restricted
          setModerationError(`🚫 ${ack.reason || 'Your account has been restricted'}`);
          setTimeout(() => setModerationError(null), 15000);
        } else if (ack?.error === 'content_violation') {
          // Content moderation violation
          setModerationError(ack.reason || 'Tin nhắn chứa nội dung không được phép');
          setTimeout(() => setModerationError(null), 8000);
        } else {
          // Other errors
          setModerationError('Không thể gửi tin nhắn. Vui lòng thử lại.');
          setTimeout(() => setModerationError(null), 5000);
        }
      });
    } catch (error) {
      setUploading(false);
      setModerationError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setTimeout(() => setModerationError(null), 3000);
    }
  };

  // Gửi sự kiện typing
  const handleTyping = () => {
    if (!conversation?._id || !payload?.userId) return;

    socket.emit('typing', {
      conversationId: conversation._id,
      userId: payload.userId,
    });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      // stop typing logic nếu cần
    }, 1000);
  };


  // Show loading while fetching conversation (only if authenticated)
  if (loading && payload?.userId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Đang tải cuộc trò chuyện...</p>
        </div>
      </div>
    );
  }

  // Only show empty message if no participants and no conversation
  if (!conversation && (!participants || participants.length < 2)) {
    return <EmptyMessage />;
  }

  // If we have participants but user is not authenticated, show empty with error
  if (participants && participants.length >= 2 && !payload?.userId) {
    return <EmptyMessage />;
  }

  // If we have participants but no conversation yet, show loading
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Đang khởi tạo cuộc trò chuyện...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-background min-h-160 h-184 max-h-184',
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className='flex items-center justify-between gap-4 p-4 border-b'>
        <div className='flex gap-2 items-center'>
          <div className='aspect-square w-10 bg-muted rounded-full border'></div>
          <h1 className='text-md font-medium capitalize'>
            {conversation?.participants.find((p) => p._id !== payload?.userId)
              ?.username || 'Unknown'}
          </h1>
        </div>
        <div className='w-full' />
        <Button
          variant={'secondary'}
          size={'icon-sm'}
          onClick={() => {
            setConversation(undefined);
            onCloseDialog?.();
          }}
        >
          <X />
        </Button>
      </div>

      {/* Message list */}
      <ScrollArea className='flex-1 p-4 overflow-hidden' ref={viewportRef}>
        <div className='gap-4 flex flex-col'>
          {messages?.length === 0 ? (
            <p className='text-muted-foreground text-sm text-center mt-4'>
              No messages yet.
            </p>
          ) : (
            messages
              ?.slice()
              .reverse()
              .map((message) => {
                const isMe = message.sender === payload?.userId;
                // Debug log
                console.log('Message:', message);
                console.log('Attachments:', message.attachments);
                return (
                  <React.Fragment key={message.id}>
                    {message.productRef && (
                      <Item variant={'muted'} className='border border-border'>
                        <ItemMedia variant={'image'} className='my-auto'>
                          <Link to={`/products/${message.productRef?._id}`}>
                            <img
                              src={message.productRef?.images?.[0]}
                              alt={message.productRef?.title}
                            />
                          </Link>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>
                            <Link to={`/products/${productRef}`}>
                              {message.productRef?.title}
                            </Link>
                          </ItemTitle>
                          <ItemDescription>
                            {message.productRef?.description}
                          </ItemDescription>
                          <ItemDescription className='font-medium'>
                            ${message.productRef?.price}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    )}
                    <div
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-2`}
                    >
                      {/* Display image attachments - OUTSIDE bubble */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className='space-y-2'>
                          {message.attachments.map((att: any, idx: number) => (
                            <div key={idx} className="relative group">
                              <img
                                src={att.url}
                                alt='Attachment'
                                className='w-full max-w-sm rounded-lg shadow-md object-cover cursor-pointer hover:shadow-lg transition-all duration-200'
                                style={{ maxHeight: '300px' }}
                                onClick={() => setViewerImage(att.url)}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {/* Zoom icon overlay on hover */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Text and timestamp in bubble */}
                      {(message.text || !message.attachments || message.attachments.length === 0) && (
                        <div
                          className={`max-w-90 px-4 py-2 rounded-lg ${isMe
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted text-foreground rounded-bl-none'
                            }`}
                        >
                          {message.text && (
                            <p className='text-sm whitespace-pre-wrap wrap-break-word'>
                              {message.text}
                            </p>
                          )}
                          <p
                            className={`text-xs mt-1 ${isMe
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                              }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString(
                              'vi-VN',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
          )}
          {typing && <div className='text-xs p-0'>...Typing</div>}
        </div>
      </ScrollArea>

      {/* Moderation Error Alert */}
      {moderationError && (
        <div className='px-4 pb-2'>
          <Alert variant='destructive' className='py-3'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription className='text-sm'>
              {moderationError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat Guidelines */}
      <ChatGuidelines />

      {/* Image Preview */}
      {imagePreview && (
        <div className='px-4 pb-2'>
          <div className='relative inline-block'>
            <img
              src={imagePreview}
              alt='Preview'
              className='max-h-32 rounded-md border border-border'
            />
            <Button
              variant='destructive'
              size='icon-sm'
              className='absolute -top-2 -right-2'
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className='h-3 w-3' />
            </Button>
          </div>
        </div>
      )}

      {/* Product ref */}
      {productRef && (
        <Item variant={'muted'} className='border border-border m-4 mt-0'>
          <ItemMedia variant={'image'} className='my-auto'>
            <Link to={`/products/${product?._id}`}>
              <img
                src={product?.images?.[0]}
                alt={product?.title}
                className='aspect-square'
              />
            </Link>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>
              <Link to={`/products/${productRef}`}>{product?.title}</Link>
            </ItemTitle>
            <ItemDescription>{product?.description}</ItemDescription>
            <ItemDescription className='font-medium'>
              ${product?.price}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              variant={'ghost'}
              size={'icon-lg'}
              onClick={() => setProductRef(undefined)}
            >
              <XIcon />
            </Button>
          </ItemActions>
        </Item>
      )}

      {/* Input */}
      <div className='border-t p-4 bg-background rounded-b-xl'>
        <div className='flex gap-2'>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleImageSelect}
          />

          {/* Image upload button */}
          <Button
            variant='outline'
            size='icon-lg'
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title='Upload ảnh'
          >
            {uploading ? (
              <Loader2 className='h-5 w-5 animate-spin' />
            ) : (
              <ImagePlus className='h-5 w-5' />
            )}
          </Button>

          <Input
            placeholder='Nhập tin nhắn...'
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className='flex-1 h-10 bg-muted'
            disabled={uploading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={(!input.trim() && !selectedImage) || uploading}
            size='icon-lg'
          >
            {uploading ? (
              <Loader2 className='h-5 w-5 animate-spin' />
            ) : (
              <SendIcon />
            )}
          </Button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewerImage && (
        <div
          className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4'
          onClick={() => setViewerImage(null)}
        >
          <div className='relative max-w-7xl max-h-full'>
            <Button
              variant='destructive'
              size='icon'
              className='absolute -top-4 -right-4 z-10'
              onClick={() => setViewerImage(null)}
            >
              <X className='h-4 w-4' />
            </Button>
            <img
              src={viewerImage}
              alt='Full size'
              className='max-w-full max-h-[90vh] object-contain rounded-lg'
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyMessage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant='default'>
          <MessageCircleX className='size-24' />
        </EmptyMedia>
        <EmptyTitle>No message selected yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t selected any message yet. Select a message to start
          chatting.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
