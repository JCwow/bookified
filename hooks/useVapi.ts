'use client';

// Create hooks/useVapi.ts: the core hook. Initializes Vapi SDK, manages call lifecycle (idle, connecting, starting, listening, thinking, speaking), tracks messages array + currentMessage streaming, handles duration timer with maxDuration enforcement, session tracking via server actions

import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

//import { useSubscription } from '@/hooks/useSubscription';
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from '@/lib/constants';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-constants';
import { getVoice } from '@/lib/utils';
import { IBook, Messages } from '@/types';
import { startVoiceSession, endVoiceSession } from '@/lib/actions/session.actions';

export function useLatestRef<T>(value: T) {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;

let vapi: InstanceType<typeof Vapi>;
function getVapi() {
    if (!vapi) {
        if (!VAPI_API_KEY) {
            throw new Error('NEXT_PUBLIC_VAPI_API_KEY environment variable is not set');
        }
        vapi = new Vapi(VAPI_API_KEY);
    }
    return vapi;
}

export type CallStatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';

export function useVapi(book: IBook, initialMaxDurationMinutes = SUBSCRIPTION_PLANS.free.maxSessionMinutes) {
    const { userId } = useAuth();
    const router = useRouter();
    //const { limits } = useSubscription();

    const [status, setStatus] = useState<CallStatus>('idle');
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessages, setCurrentMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [currentUserMessage, setCurrentUserMessage] = useState('');
    const [duration, setDuration] = useState(0);
    const [maxDurationSeconds, setMaxDurationSeconds] = useState(
        Math.max(1, initialMaxDurationMinutes) * SECONDS_PER_MINUTE,
    );
    const [limitError, setLimitError] = useState<string | null>(null);
    const [isBillingError, setIsBillingError] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isStoppingRef = useRef(false);
    const hasReachedLimitRef = useRef(false);

    // Keep refs in sync with latest values for use in callbacks
    const maxDurationRef = useLatestRef(maxDurationSeconds);
    const durationRef = useLatestRef(duration);
    const voice = book.persona || DEFAULT_VOICE;

    useEffect(() => {
        // Keep the visible cap in sync with current plan when idle.
        if (status === 'idle') {
            setMaxDurationSeconds(Math.max(1, initialMaxDurationMinutes) * SECONDS_PER_MINUTE);
        }
    }, [initialMaxDurationMinutes, status]);

    const normalizeConversationMessages = useCallback(
        (
            items: Array<{
                role?: string;
                content?: string;
                message?: string;
            }> = [],
        ): Messages[] =>
            items
                .map((item) => ({
                    role: item.role ?? '',
                    content: (item.content ?? item.message ?? '').trim(),
                }))
                .filter((item) => (item.role === 'assistant' || item.role === 'user') && !!item.content),
        [],
    );

    const mergeConversationMessages = useCallback((previous: Messages[], incoming: Messages[]): Messages[] => {
        if (incoming.length === 0) return previous;
        if (previous.length === 0) return incoming;

        const merged = [...previous];
        for (const message of incoming) {
            const alreadyExists = merged.some(
                (item) => item.role === message.role && item.content === message.content,
            );
            if (!alreadyExists) {
                merged.push(message);
            }
        }
        return merged;
    }, []);

    // Set up Vapi event listeners
    useEffect(() => {
        const handlers = {
            'call-start': () => {
                isStoppingRef.current = false;
                setStatus('starting'); // AI speaks first, wait for it
                setCurrentMessages([]);
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Start duration timer
                startTimeRef.current = Date.now();
                setDuration(0);
                timerRef.current = setInterval(() => {
                    if (startTimeRef.current) {
                        const newDuration = Math.floor((Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS);
                        setDuration(newDuration);

                        if (newDuration >= maxDurationRef.current) {
                            hasReachedLimitRef.current = true;
                            getVapi().stop();
                            setLimitError(
                                `Session time limit (${Math.floor(
                                    maxDurationRef.current / SECONDS_PER_MINUTE,
                                )} minutes) reached. Upgrade your plan for longer sessions.`,
                            );
                        }
                    }
                }, TIMER_INTERVAL_MS);
            },

            'call-end': () => {
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessages([]);
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session:', err),
                    );
                    sessionIdRef.current = null;
                }

                startTimeRef.current = null;

                if (hasReachedLimitRef.current) {
                    hasReachedLimitRef.current = false;
                    router.push('/');
                }
            },

            'speech-start': () => {
                if (!isStoppingRef.current) {
                    setStatus('speaking');
                }
            },
            'speech-end': () => {
                if (!isStoppingRef.current) {
                    // After AI finishes speaking, user can talk
                    setStatus('listening');
                }
            },

            message: (message: {
                type?: string;
                role?: string;
                transcriptType?: string;
                transcript?: string;
                messages?: Array<{ role?: string; content?: string; message?: string }>;
            }) => {
                if (message.type === 'conversation-update' && Array.isArray(message.messages)) {
                    const conversationMessages = normalizeConversationMessages(message.messages);
                    setMessages((prev) => mergeConversationMessages(prev, conversationMessages));
                    return;
                }

                if (message.type !== 'transcript') return;

                const role = message.role;
                const transcriptType = message.transcriptType;
                const transcript = message.transcript?.trim() ?? '';

                if (!role || !transcriptType || !transcript) return;

                // User finished speaking → AI is thinking
                if (role === 'user' && transcriptType === 'final') {
                    if (!isStoppingRef.current) {
                        setStatus('thinking');
                    }
                    setCurrentUserMessage('');
                    setCurrentMessages((prev) => prev.filter((item) => item.role !== 'user'));
                }

                // Partial user transcript → show real-time typing
                if (role === 'user' && transcriptType === 'partial') {
                    setCurrentUserMessage(transcript);
                    setCurrentMessages((prev) => {
                        const withoutUser = prev.filter((item) => item.role !== 'user');
                        return [...withoutUser, { role: 'user', content: transcript }];
                    });
                    return;
                }

                // Partial AI transcript → show word-by-word
                if (role === 'assistant' && transcriptType === 'partial') {
                    setCurrentMessage(transcript);
                    setCurrentMessages((prev) => {
                        const withoutAssistant = prev.filter((item) => item.role !== 'assistant');
                        return [...withoutAssistant, { role: 'assistant', content: transcript }];
                    });
                    return;
                }

                // Final transcript → add to messages
                if (transcriptType === 'final') {
                    if (role === 'assistant') setCurrentMessage('');
                    if (role === 'user') setCurrentUserMessage('');
                    setCurrentMessages((prev) => prev.filter((item) => item.role !== role));

                    setMessages((prev) => {
                        const isDupe = prev.some(
                            (m) => m.role === role && m.content === transcript,
                        );
                        return isDupe ? prev : [...prev, { role, content: transcript }];
                    });
                }
            },

            error: (error: Error) => {
                console.error('Vapi error:', error);
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessages([]);
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer on error
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking on error
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session on error:', err),
                    );
                    sessionIdRef.current = null;
                }

                // Show user-friendly error message
                const errorMessage = error.message?.toLowerCase() || '';
                if (errorMessage.includes('timeout') || errorMessage.includes('silence')) {
                    setLimitError('Session ended due to inactivity. Click the mic to start again.');
                } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                    setLimitError('Connection lost. Please check your internet and try again.');
                } else {
                    setLimitError('Session ended unexpectedly. Click the mic to start again.');
                }

                startTimeRef.current = null;
            },
        };

        // Register all handlers
        Object.entries(handlers).forEach(([event, handler]) => {
            getVapi().on(event as keyof typeof handlers, handler as () => void);
        });

        return () => {
            // End active session on unmount
            if (sessionIdRef.current) {
                const sessionDurationSeconds = durationRef.current;
                getVapi().stop();
                endVoiceSession(sessionIdRef.current, sessionDurationSeconds).catch((err) =>
                    console.error('Failed to end voice session on unmount:', err),
                );
                sessionIdRef.current = null;
            }
            // Cleanup handlers
            Object.entries(handlers).forEach(([event, handler]) => {
                getVapi().off(event as keyof typeof handlers, handler as () => void);
            });
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [mergeConversationMessages, normalizeConversationMessages, router]);

    const start = useCallback(async () => {
        if (!userId) {
            setLimitError('Please sign in to start a voice session.');
            return;
        }

        setLimitError(null);
        setIsBillingError(false);
        setStatus('connecting');

        try {
            // Check session limits and create session record
            const result = await startVoiceSession(userId, book._id);

            if (!result.success) {
                setLimitError(result.error || 'Session limit reached. Please upgrade your plan.');
                setIsBillingError(!!result.isBillingError);
                setStatus('idle');
                return;
            }

            sessionIdRef.current = result.sessionId || null;
            hasReachedLimitRef.current = false;
            if (typeof result.maxDurationMinutes === 'number') {
                setMaxDurationSeconds(result.maxDurationMinutes * SECONDS_PER_MINUTE);
            }

            const firstMessage = `Hey, good to meet you. Quick question before we dive in - have you actually read ${book.title} yet, or are we starting fresh?`;

            await getVapi().start(ASSISTANT_ID, {
                firstMessage,
                variableValues: {
                    title: book.title,
                    author: book.author,
                    bookId: book._id,
                },
                voice: {
                    provider: '11labs' as const,
                    voiceId: getVoice(voice).id,
                    model: 'eleven_turbo_v2_5' as const,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
                },
            });
        } catch (err) {
            console.error('Failed to start call:', err);
            setStatus('idle');
            setLimitError('Failed to start voice session. Please try again.');
        }
    }, [book._id, book.title, book.author, voice, userId]);

    const stop = useCallback(() => {
        isStoppingRef.current = true;
        getVapi().stop();
    }, []);

    const clearError = useCallback(() => {
        setLimitError(null);
        setIsBillingError(false);
    }, []);

    const isActive =
        status === 'starting' ||
        status === 'listening' ||
        status === 'thinking' ||
        status === 'speaking';

    // Calculate remaining time
    // const maxDurationSeconds = limits.maxSessionMinutes * SECONDS_PER_MINUTE;
    // const remainingSeconds = Math.max(0, maxDurationSeconds - duration);
    // const showTimeWarning =
    //     isActive && remainingSeconds <= TIME_WARNING_THRESHOLD && remainingSeconds > 0;

    return {
        status,
        isActive,
        messages,
        currentMessages,
        currentMessage,
        currentUserMessage,
        duration,
        maxDurationSeconds,
        start,
        stop,
        limitError,
        isBillingError,
        clearError,
    };
}

export default useVapi;