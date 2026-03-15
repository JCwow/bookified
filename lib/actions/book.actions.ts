'use server';
import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import { generateSlug, serializeData } from "@/lib/utils";
import Book from "@/database/models/book.model"
import BookSegment from "@/database/models/book-segment.model";
import { del } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";

export const getAllBooks = async () => {
    try{
        await connectToDatabase();
        const books = await Book.find().sort({createdAt: -1}).lean();
        return {
            success: true,
            data: serializeData(books)
        }
    }catch(e){
        console.error('Error connecting to database', e);
        return{
            success: false,
            error: e
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try{
        const { userId } = await auth();
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized"
            };
        }

        await connectToDatabase();
        const book = await Book.findOne({ slug, clerkId: userId })
            .select("title author coverURL persona slug")
            .lean();

        if (!book) {
            return {
                success: false,
                error: "Book not found"
            };
        }

        return {
            success: true,
            data: serializeData(book)
        };
    }catch(e){
        console.error('Error getting book by slug', e);
        return{
            success: false,
            error: e
        }
    }
}

export const checkBookExists = async(title: string) => {
    try{
        await connectToDatabase();
        const slug = generateSlug(title);
        const existingBook = await Book.findOne({slug}).lean();
        if(existingBook){
            return {
                exists: true,
                book: serializeData(existingBook)
            }
        }
        return {
            exists: false
        }
    }catch(e){
        console.error('Error checking book exists', e);
        return{
            exists: false,
            error: e
        }
    }
}

export const createBook = async(data: CreateBook) => {
    try{
        const { userId } = await auth();
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized"
            };
        }

        await connectToDatabase();
        const slug = generateSlug(data.title);
        const existingBook = await Book.findOne({slug}).lean();
        if(existingBook){
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true
            }
        }
        // Todo: Cheeck subscription limits before creating a book
        const { clerkId: _ignoredClerkId, ...bookData } = data;
        const book = await Book.create({
            ...bookData,
            clerkId: userId,
            slug,
            totalSegments: 0
        });
        return {
            success: true,
            data: serializeData(book)
        }
    }catch(e){
        console.error('Error creating a book', e);
        return {
            success: false,
            error: e
        }
    }
}

export const saveBookSegments = async(bookId: string, _clerkId: string, segments: TextSegment[]) => {
    let userId: string | null = null;

    try{
        const authResult = await auth();
        userId = authResult.userId;
        if (!userId) {
            return {
                success: false,
                error: "Unauthorized"
            };
        }

        await connectToDatabase();
        console.log('Saving book segments ...');

        const ownedBook = await Book.findOne({ _id: bookId, clerkId: userId }).lean();
        if (!ownedBook) {
            return {
                success: false,
                error: "Book not found or unauthorized"
            };
        }

        const segmentsToInsert = segments.map(({text, segmentIndex, pageNumber, wordCount}) => ({
            clerkId: userId,
            bookId,
            content: text,
            segmentIndex,
            pageNumber,
            wordCount
        }))
        await BookSegment.insertMany(segmentsToInsert);

        const bookToUpdate = await Book.findOne({ _id: bookId, clerkId: userId }).lean();
        if (!bookToUpdate) {
            throw new Error("Book not found or unauthorized while updating");
        }

        await Book.updateOne({ _id: bookId, clerkId: userId }, { totalSegments: segments.length });
        console.log('Book segments saved successfully.');
        return {
            success: true,
            data: {segmentsCreated: segments.length}
        }
    }catch(e){
       console.error('Error saving book segments', e);

       if (userId) {
           const ownedBook = await Book.findOne({ _id: bookId, clerkId: userId }).lean();
           if (ownedBook?.clerkId === userId) {
               await BookSegment.deleteMany({ bookId, clerkId: userId });
               console.log('Deleted book segments due to failure to save segments.');
           }
       }

       return {
           success: false,
           error: e
       }
    }
}

export const deleteUploadedBlob = async (pathname?: string | null) => {
    if (!pathname) {
        return { success: true };
    }

    try {
        await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
        return { success: true };
    } catch (e) {
        console.error('Error deleting uploaded blob', e);
        return {
            success: false,
            error: e
        };
    }
}