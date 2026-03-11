import { handleUpload, HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {auth} from "@clerk/nextjs/server";
import { MAX_FILE_SIZE, MAX_IMAGE_SIZE } from "@/lib/constants";

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
const IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
type UploadBodyWithContentType = HandleUploadBody & {
    contentType?: string;
    payload?: {
        contentType?: string;
    };
};

export async function POST(request: Request): Promise<NextResponse>{
    try{
        const body = (await request.json()) as HandleUploadBody;
        const jsonResponse = await handleUpload({
            token: process.env.BLOB_READ_WRITE_TOKEN,
            body,
            request, 
            onBeforeGenerateToken: async () => {
                const {userId} = await auth()
                if(!userId){
                    throw new Error("Unauthorized");
                }
                const contentType =
                    (body as UploadBodyWithContentType).contentType ??
                    (body as UploadBodyWithContentType).payload?.contentType;
                if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
                    throw new Error("Invalid upload content type");
                }
                return{
                    allowedContentTypes: [contentType],
                    addRandomSuffix: true,
                    maximumSizeInBytes: IMAGE_CONTENT_TYPES.has(contentType) ? MAX_IMAGE_SIZE : MAX_FILE_SIZE,
                    tokenPayload: JSON.stringify({userId})
                }
            },
            onUploadCompleted: async({blob, tokenPayload}) => {
                console.log('File uploaded to blob: ', blob.url);
                const payload = tokenPayload ? JSON.parse(tokenPayload): null;
                const userId = payload?.userId;

                // TODO: Posting
                
            },
        });
        return NextResponse.json(jsonResponse)
    }catch(e){
        const message = e instanceof Error ? e.message: "An unknown error occerred";
        const isInvalidJson = e instanceof SyntaxError || message.toLowerCase().includes("json");
        const status = isInvalidJson ? 400 : message.includes("Unauthorized") ? 401 : 500;
        const errorMessage = isInvalidJson ? "Invalid JSON body" : message;
        return NextResponse.json({error: errorMessage}, {status});
    }
}