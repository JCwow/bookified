'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

type TranscriptMessage = {
  role: string;
  content: string;
};

type TranscriptProps = {
  messages: TranscriptMessage[];
  currentMessages: TranscriptMessage[];
  currentMessage: string;
  currentUserMessage: string;
};

const Transcript = ({
  messages,
  currentMessages,
  currentMessage,
  currentUserMessage,
}: TranscriptProps) => {
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!messagesRef.current) return;
    if (shouldAutoScrollRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, currentMessages, currentMessage, currentUserMessage]);

  const handleScroll = () => {
    if (!messagesRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    shouldAutoScrollRef.current = distanceFromBottom < 60;
  };

  const fallbackCurrentMessages: TranscriptMessage[] = [];
  if (currentUserMessage.trim()) {
    fallbackCurrentMessages.push({ role: 'user', content: currentUserMessage.trim() });
  }
  if (currentMessage.trim()) {
    fallbackCurrentMessages.push({ role: 'assistant', content: currentMessage.trim() });
  }

  const liveMessages = currentMessages.length > 0 ? currentMessages : fallbackCurrentMessages;

  const hasMessages =
    messages.length > 0 || liveMessages.length > 0;

  if (!hasMessages) {
    return (
      <div className="transcript-container">
        <div className="transcript-empty">
          <Mic className="mb-4 h-12 w-12 text-[#212a3b]" />
          <p className="transcript-empty-text">No conversation yet</p>
          <p className="transcript-empty-hint">
            Click the mic button above to start talking
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-container">
      <div ref={messagesRef} className="transcript-messages" onScroll={handleScroll}>
        {messages.map((message, index) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={`${message.role}-${index}-${message.content}`}
              className={`transcript-message ${
                isUser ? 'transcript-message-user' : 'transcript-message-assistant'
              }`}
            >
              <div
                className={`transcript-bubble ${
                  isUser
                    ? 'transcript-bubble-user'
                    : 'transcript-bubble-assistant'
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}

        {liveMessages.map((message, index) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={`live-${message.role}-${index}`}
              className={`transcript-message ${
                isUser ? 'transcript-message-user' : 'transcript-message-assistant'
              }`}
            >
              <div
                className={`transcript-bubble ${
                  isUser ? 'transcript-bubble-user' : 'transcript-bubble-assistant'
                }`}
              >
                {message.content}
                <span className="transcript-cursor" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Transcript;
