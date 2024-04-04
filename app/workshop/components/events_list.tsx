'use client';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

const EventList = () => {
  return (
    <div className="flex flex-col gap-6 mx-auto justify-center p-10 xl:w-1/2">
      <div className="flex justify-between">
        <h1 className="text-3xl font-semibold">Event Series</h1>
        <div className="">
          <Link
            className={buttonVariants({ variant: 'default' })}
            href="/event_series/create"
          >
            Create New Event Series
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventList;
