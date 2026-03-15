'use client';
import { Mic, MicOff } from 'lucide-react';
import useVapi from '@/hooks/useVapi';
import { IBook } from '@/types';
import Image from 'next/image';
import Transcript from './Transcript';

const VapiControls = ({ book }: { book: IBook }) => {
  const {
    messages,
    currentMessages,
    currentMessage,
    currentUserMessage,
    isActive,
    status,
    start,
    stop,
  } = useVapi(book);
  const isAiResponding = isActive && (status === 'speaking' || status === 'thinking');

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="vapi-header-card">
        <div className="vapi-cover-wrapper">
          <Image
            src={book.coverURL}
            alt={`${book.title} cover`}
            width={120}
            height={180}
            className="vapi-cover-image w-[120px]! h-auto!"
            priority
          />

          <div className="vapi-mic-wrapper">
            {isAiResponding && <span className="vapi-pulse-ring" aria-hidden="true" />}
            <button
              onClick={isActive ? stop : start}
              disabled={status === 'connecting'}
              type="button"
              className={`vapi-mic-btn ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
              aria-label={isActive ? 'Microphone active' : 'Microphone inactive'}
            >
              {isActive ? (
                <Mic className="size-6 text-[#212a3b]" />
              ) : (
                <MicOff className="size-6 text-[#212a3b]" />
              )}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#212a3b] md:text-3xl">
              {book.title}
            </h1>
            <p className="text-base text-[#3d485e]">by {book.author}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="vapi-status-indicator">
              <span className="vapi-status-dot vapi-status-dot-ready" />
              <span className="vapi-status-text">Ready</span>
            </div>

            <div className="vapi-status-indicator">
              <span className="vapi-status-text">Voice: {book.persona}</span>
            </div>

            <div className="vapi-status-indicator">
              <span className="vapi-status-text">0:00/15:00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="vapi-transcript-wrapper">
        <Transcript
          messages={messages}
          currentMessages={currentMessages}
          currentMessage={currentMessage}
          currentUserMessage={currentUserMessage}
        />
      </div>
    </section>
  );
};

export default VapiControls;