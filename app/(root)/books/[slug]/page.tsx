import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { getBookBySlug } from "@/lib/actions/book.actions";
import VapiControls from "@/components/VapiControls";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const BookDetailsPage = async ({ params }: PageProps) => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { slug } = await params;
  const result = await getBookBySlug(slug);

  if (!result.success || !result.data) {
    redirect("/");
  }

  const book= result.data;

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Go back to library">
        <ArrowLeft className="size-5 text-[#212a3b]" />
      </Link>
      <VapiControls book={book}></VapiControls>
    </main>
  );
};

export default BookDetailsPage;
