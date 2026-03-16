import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBookBySlug } from "@/lib/actions/book.actions";
import VapiControls from "@/components/VapiControls";
import { getCurrentUserPlanServer } from "@/lib/subscription/server";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-constants";

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
  const planData = await getCurrentUserPlanServer();

  if (!result.success || !result.data) {
    redirect("/");
  }

  const book= result.data;

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Go back to library">
        <ArrowLeft className="size-5 text-[#212a3b]" />
      </Link>
      <VapiControls
        book={book}
        initialMaxDurationMinutes={
          planData?.limits.maxSessionMinutes ?? SUBSCRIPTION_PLANS.free.maxSessionMinutes
        }
      ></VapiControls>
    </main>
  );
};

export default BookDetailsPage;
