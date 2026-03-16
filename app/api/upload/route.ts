import { handleUpload, HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {auth} from "@clerk/nextjs/server";
import { MAX_FILE_SIZE, MAX_IMAGE_SIZE } from "@/lib/constants";

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
type UploadBodyWithContentType = HandleUploadBody & {
    contentType?: string;
    pathname?: string;
    payload?: {
        contentType?: string;
    };
};

export async function POST(request: Request): Promise<NextResponse>{
    try{
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        if (!blobToken) {
            throw new Error("Missing BLOB_READ_WRITE_TOKEN");
        }

        const body = (await request.json()) as UploadBodyWithContentType;
        const jsonResponse = await handleUpload({
            token: blobToken,
            body,
            request, 
            onBeforeGenerateToken: async () => {
                const {userId} = await auth()
                if(!userId){
                    throw new Error("Unauthorized");
                }
                const contentType = body.contentType ?? body.payload?.contentType;
                if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
                    throw new Error("Invalid upload content type");
                }

                const pathname = (body.pathname ?? "").toLowerCase();
                const isImageUpload = /\.(jpe?g|png|webp)$/.test(pathname);
                return{
                    allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
                    addRandomSuffix: true,
                    maximumSizeInBytes: isImageUpload ? MAX_IMAGE_SIZE : MAX_FILE_SIZE,
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
        const isValidationError = message.toLowerCase().includes("invalid upload content type");
        const status = isInvalidJson ? 400 : isValidationError ? 400 : message.includes("Unauthorized") ? 401 : 500;
        const errorMessage = isInvalidJson ? "Invalid JSON body" : message;
        return NextResponse.json({error: errorMessage}, {status});
    }
}