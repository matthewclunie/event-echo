import authOptions from '@/app/api/auth/auth_options';
import AccessDenied from '@/app/components/access_denied';
import FavoriteButton from '@/app/components/buttons/favorite_button';
import LikeButton from '@/app/components/buttons/like_button';
import EventDescription from '@/app/components/event_description/event_description';
import Timeline from '@/app/components/timeline/timeline';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import prisma from '@/db';
import { useSeriesLikes } from '@/lib/use_series_likes';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Eye } from 'lucide-react';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// export async function generateStaticParams() {
//   const eventSeries = await prisma.eventSeries.findMany({});
//   return eventSeries.map((series) => {
//     id: series.id;
//   });
// }

export default async function EventSeriesPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const id = Number(params.id);
  const eventSeries = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      creator: true,
    },
  });

  const updatedViews = await prisma.eventSeries.update({
    where: { id },
    data: {
      view_count: {
        increment: 1,
      },
    },
  });

  const isLikedOrFavorited = await useSeriesLikes({
    eventId: id,
    userId: session?.user.id,
  });

  if (!eventSeries) notFound();

  if (session?.user.id !== eventSeries.creator_id && eventSeries.is_private) {
    return (
      <AccessDenied message="This event series is private." loggedIn={true} />
    );
  }

  const seriesEvents = await prisma.event.findMany({
    where: {
      event_series_id: eventSeries.id,
    },
    include: {
      source_contents: {
        include: {
          source_content: {
            include: {
              comment: true,
            },
          },
        },
      },
    },
  });

  const seriesComments = seriesEvents.map((evt) => {
    const { comment, id, title } = evt.source_contents[0].source_content;
    return {
      source_content_id: id,
      contents: comment?.contents || '',
      title: title,
      event_position: evt.event_position,
    };
  });

  return (
    <div className="p-10">
      <div className="mb-2">
        <div className="flex justify-between items-center">
          <div className="text-3xl font-medium line-clamp-2">
            {eventSeries.title}
          </div>
          <div className="flex items-center">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <LikeButton
                  eventId={id}
                  liked={isLikedOrFavorited.liked}
                  count={isLikedOrFavorited.likeCount || 0}
                />
              </div>
              <div className="flex flex-col">
                <FavoriteButton
                  eventId={id}
                  favorited={isLikedOrFavorited.favorited}
                  count={isLikedOrFavorited.favCount || 0}
                />
              </div>
              <div className="flex flex-col mr-4">
                <Eye className="m-2" />
                <p className="text-center">{updatedViews.view_count}</p>
              </div>
            </div>
            {session?.user.id === eventSeries?.creator_id && (
              <Link
                className={buttonVariants({ variant: 'default' })}
                href={`/workshop/${params.id}`}
              >
                Edit
              </Link>
            )}
          </div>
        </div>
        <div className="text-md inline-block">
          <Link href={`/user/${eventSeries.creator_id}`}>
            {eventSeries.creator.name}
            <h3 className="text-sm">@{eventSeries.creator.username}</h3>
          </Link>
        </div>
      </div>
      <EventDescription description={eventSeries.description} />
      <div className={`block lg:flex w-full max-h-[530px]`}>
        <div
          className={`mb-2 mr-4 ${eventSeries.details ? 'w-3/4' : 'w-full'} lg:mb-0`}
        >
          <Timeline comments={seriesComments} />
        </div>
        {eventSeries.details && (
          <Card className="w-1/4">
            <CardHeader>
              <CardTitle>Details:</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <ScrollArea className="h-4/5 px-4">
                {eventSeries.details}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
