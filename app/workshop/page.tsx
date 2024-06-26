import { buttonVariants } from '@/components/ui/button';
import prisma from '@/db';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { Suspense } from 'react';
import authOptions from '../api/auth/auth_options';
import LoginPrompt from '../components/login_prompt';
import WorkshopPagination from '../components/pagination/workshop_pagination';
import CategorySelect from '../components/search/category_select';
import Search from '../components/search/search';
import SortSelect from '../components/search/sort_select';
import { SearchSkeleton } from '../components/skeletons';
import { SubcategoryWithCategory } from '../event_series/page';

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    category?: string;
    subcategory?: string;
    order?: string;
  };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex h-screen items-center">
        <LoginPrompt />
      </div>
    );
  }

  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const category = searchParams?.category || '';
  const subcategory = searchParams?.subcategory || '';
  const order = searchParams?.order || '';

  const categories = await prisma.eventCategory.findMany({
    orderBy: {
      id: 'asc',
    },
  });
  const subcategories: SubcategoryWithCategory[] =
    await prisma.eventSubCategory.findMany({
      include: {
        event_category: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

  return (
    <div className="flex flex-col gap-6 mx-auto justify-center pt-10">
      <div className="flex gap-4 justify-between px-10 items-center">
        <h1 className="text-2xl sm:text-3xl font-semibold">
          Event Series Workshop
        </h1>
        <Link
          className={buttonVariants({ variant: 'default' })}
          href="/workshop/create"
        >
          Create New Event Series
        </Link>
      </div>
      <div className="flex flex-col">
        <div className="w-full flex flex-col lg:flex-row gap-4 mx-auto px-10">
          <div className="grow">
            <Search placeholder="Search&#8230;" />
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <CategorySelect
              categories={categories}
              subcategories={subcategories}
            />
            <SortSelect />
          </div>
        </div>
        <div className="flex flex-col gap-6 p-10 justify-center">
          <Suspense key={query + currentPage} fallback={<SearchSkeleton />}>
            <WorkshopPagination
              query={query}
              currentPage={currentPage}
              category={category}
              subcategory={subcategory}
              order={order}
              creatorId={session?.user.id}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
