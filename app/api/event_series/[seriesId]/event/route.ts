import { EventReqParams } from '@/app/event_series/[id]/edit/add_event_card';
import prisma from '@/db';

// GET /event_series/[seriesId]/event

export async function GET(
  request: Request,
  { params }: { params: { seriesId: string } },
) {
  const { seriesId } = params;
  try {
    const results = await prisma.event.findMany({
      where: {
        event_series: {
          some: {
            event_series_id: Number(seriesId),
          },
        },
      },
      include: {
        source_contents: {
          include: {
            source_content: true,
          },
        },
      },
    });

    return Response.json({ results }, { status: 200 });
  } catch {
    return Response.json({ status: 400 });
  }
}

// POST /event_series/[seriesId]/event

export async function POST(request: Request) {
  const { event } = await request.json();

  const {
    title,
    description,
    creator_id,
    eventSeriesId,
    videoId,
    socialMediaId,
    socialMediaPlatformId,
    thumbnails,
    channelId,
  }: EventReqParams = event;

  try {
    let sourceContent = await prisma.sourceContent.findFirst({
      where: { content_id: videoId },
    });

    if (!sourceContent) {
      let contentCreator = await prisma.sourceContentCreator.findFirst({
        where: { social_media_id: socialMediaId },
      });

      if (!contentCreator) {
        contentCreator = await prisma.sourceContentCreator.create({
          data: {
            social_media_platform_id: socialMediaPlatformId,
            social_media_id: socialMediaId,
          },
        });
      }
      sourceContent = await prisma.sourceContent.create({
        data: {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          content_id: videoId,
          channel_id: channelId,
          title,
          social_media_platform_id: socialMediaPlatformId,
          social_content_creator_id: contentCreator.id,
          thumbnails,
        },
      });
    }

    let eventExists = await prisma.event.findFirst({
      where: {
        AND: [
          {
            event_series: {
              some: {
                event_series_id: eventSeriesId,
              },
            },
          },
          {
            source_contents: {
              some: {
                source_content: {
                  content_id: videoId,
                },
              },
            },
          },
        ],
      },
    });

    if (eventExists) {
      throw new Error('403');
    }

    const createdEvent = await prisma.event.create({
      data: {
        title,
        description,
        creator_id,
      },
    });

    const currentMaxPosition = await prisma.eventSeriesEvent.findMany({
      where: { event_series_id: eventSeriesId },
      orderBy: [
        {
          event_position: 'desc',
        },
      ],
      take: 1,
    });

    const newSourceContentEvent = await prisma.sourceContentEvent.create({
      data: {
        event_id: createdEvent.id,
        source_content_id: sourceContent.id,
      },
    });

    const newEventSeriesEvent = await prisma.eventSeriesEvent.create({
      data: {
        event_id: createdEvent.id,
        event_series_id: eventSeriesId,
        event_position: currentMaxPosition[0].event_position + 1,
      },
    });

    return Response.json(
      {
        success: true,
        event: newEventSeriesEvent,
        sourceContentId: sourceContent.id,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === '403') {
      return Response.json({
        status: 403,
        message: 'This event already exists',
      });
    }
    return Response.json({ status: 400 });
  }
}