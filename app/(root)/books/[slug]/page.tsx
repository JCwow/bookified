import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { getBookBySlug } from "@/lib/actions/book.actions";

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

  const { title, author, coverURL, persona } = result.data;

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Go back to library">
        <ArrowLeft className="size-5 text-[#212a3b]" />
      </Link>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <article className="vapi-header-card">
          <div className="vapi-cover-wrapper">
            <Image
              src={coverURL}
              alt={`${title} cover`}
              width={120}
              height={180}
              className="h-auto w-[120px] rounded-lg object-cover shadow-soft-md"
              priority
            />

            <div className="vapi-mic-wrapper">
              <button type="button" className="vapi-mic-btn" aria-label="Microphone muted">
                <MicOff className="size-6 text-[#212a3b]" />
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#212a3b] md:text-3xl">{title}</h1>
              <p className="text-base text-[#3d485e]">by {author}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="vapi-status-indicator">
                <span className="vapi-status-dot vapi-status-dot-ready" />
                <span className="vapi-status-text">Ready</span>
              </div>

              <div className="vapi-status-indicator">
                <span className="vapi-status-text">Voice: {persona}</span>
              </div>

              <div className="vapi-status-indicator">
                <span className="vapi-status-text">0:00/15:00</span>
              </div>
            </div>
          </div>
        </article>

        <article className="transcript-container min-h-[400px]">
          <div className="transcript-empty">
            <Mic className="mb-4 h-12 w-12 text-[#212a3b]" />
            <p className="transcript-empty-text">No conversation yet</p>
            <p className="transcript-empty-hint">Click the mic button above to start talking</p>
          </div>
        </article>
      </section>
    </main>
  );
};

export default BookDetailsPage;
