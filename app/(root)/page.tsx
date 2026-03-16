import HeroSection from '@/components/HeroSection';
import BookCard from '@/components/BookCard';
import BookSearchBar from '@/components/BookSearchBar';
import { searchBooks } from '@/lib/actions/book.actions';
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    query?: string | string[];
  }>;
};

const Page = async ({ searchParams }: PageProps) => {
  const resolvedSearchParams = await searchParams;
  const rawQuery = resolvedSearchParams.query;
  const query = Array.isArray(rawQuery) ? rawQuery[0] ?? '' : rawQuery ?? '';

  const bookResults = await searchBooks(query);
  const books = bookResults.success ? bookResults.data ?? []: [];

  return (
      <main className="wrapper container">
        <HeroSection />
        <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">Recent Books</h2>
          <BookSearchBar initialQuery={query} />
        </section>
        <div className="library-books-grid">
          {books.map((book) => (
            <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug}></BookCard>
          ))}
        </div>
      </main>
  );
};

export default Page;