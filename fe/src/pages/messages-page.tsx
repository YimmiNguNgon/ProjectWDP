import { Messages } from "@/components/chat/messages";
import ConversationList from "@/components/chat/conversation-list";
import { Card } from "@/components/ui/card";
import { MessageContext, type Conversation, type Message } from "@/hooks/use-message";
import { useState } from "react";
import type { ProductDetail } from "@/pages/product-detail";

export default function MessagesPage() {
    const [participants, setParticipantsState] = useState<string[]>([]);
    const [conversation, setConversation] = useState<Conversation | undefined>();
    const [messages, setMessages] = useState<Message[] | undefined>();
    const [productRef, setProductRef] = useState<string | undefined>();
    const [product, setProduct] = useState<ProductDetail | undefined>();

    const setParticipants = (newParticipants: string[]) => {
        setParticipantsState(newParticipants);
    };

    return (
        <MessageContext.Provider
            value={{
                participants,
                setParticipants,
                conversation,
                setConversation,
                messages,
                setMessages,
                productRef,
                setProductRef,
                product,
            }}
        >
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Messages</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px]">
                    {/* Conversation List - Left Sidebar */}
                    <Card className="md:col-span-1 p-4">
                        <h2 className="text-lg font-semibold mb-4">Conversations</h2>
                        <ConversationList />
                    </Card>

                    {/* Messages Panel - Main Content */}
                    <Card className="md:col-span-2">
                        <Messages />
                    </Card>
                </div>
            </div>
        </MessageContext.Provider>
    );
}
