'use client';

import { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type BookSearchBarProps = {
  initialQuery?: string;
};

const BookSearchBar = ({ initialQuery = "" }: BookSearchBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set("query", value);
    } else {
      params.delete("query");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="library-search-wrapper">
      <input
        type="search"
        name="query"
        placeholder="Search by title or author"
        defaultValue={initialQuery}
        onChange={handleSearchChange}
        className="library-search-input"
        aria-label="Search books by title or author"
      />
    </div>
  );
};

export default BookSearchBar;
