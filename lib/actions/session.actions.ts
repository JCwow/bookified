'use server';

import VoiceSession from "@/database/models/voice-session.model";
import { connectToDatabase } from "@/database/mongoose";
import {getCurrentBillingPeriodStart} from '@/lib/subscription-constants';
import { getPlanLimitsFromHas } from "@/lib/subscription/utils";
import { EndSessionResult, StartSessionResult } from '@/types';
import { auth } from "@clerk/nextjs/server";

export const startVoiceSession = async (_clerkId: string, bookId: string): Promise<StartSessionResult> => {
    try{
        const authState = await auth();
        const userId = authState.userId;
        const has = (authState as { has?: Parameters<typeof getPlanLimitsFromHas>[0] }).has;
        if (!userId) {
            return {
                success: false,
                error: 'Unauthorized. Please sign in again.',
            };
        }

        await connectToDatabase();
        const { plan, limits } = getPlanLimitsFromHas(has);
        const billingPeriodStart = getCurrentBillingPeriodStart();

        if (limits.maxSessionsPerMonth !== null) {
            const currentSessionCount = await VoiceSession.countDocuments({
                clerkId: userId,
                billingPeriodStart,
            });

            if (currentSessionCount >= limits.maxSessionsPerMonth) {
                return {
                    success: false,
                    error: `Monthly session limit reached for ${plan} plan (${limits.maxSessionsPerMonth} sessions). Upgrade your plan to continue.`,
                    isBillingError: true,
                    maxDurationMinutes: limits.maxSessionMinutes,
                };
            }
        }

        const session = await VoiceSession.create({
            clerkId: userId,
            bookId, 
            startedAt: new Date(), 
            billingPeriodStart,
            durationSeconds: 0
        })
        return {
            success: true,
            sessionId: session._id.toString(),
            maxDurationMinutes: limits.maxSessionMinutes,
        }
    }catch(e){
        console.error('Error starting voice session', e);
        return{
            success: false,
            error: 'Failed to start voice session. Please try again later.'
        }
    }
}

export const endVoiceSession = async (
    sessionId: string,
    durationSeconds: number
): Promise<EndSessionResult> => {
    try {
        await connectToDatabase();

        const result = await VoiceSession.findByIdAndUpdate(
            sessionId,
            {
                endedAt: new Date(),
                durationSeconds,
            }
        );

        if (!result) {
            return { success: false, error: 'Voice session not found.' };
        }

        return { success: true };
    } catch (e) {
        console.error('Error ending voice session', e);
        return { success: false, error: 'Failed to end voice session. Please try again later.'};
    }
};