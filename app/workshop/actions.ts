'use server';

import prisma from '@/db';
import { getServerSession } from 'next-auth';
import authOptions from '../api/auth/auth_options';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Event } from '@prisma/client';

export async function createEventSeries(prevState: any, formData: FormData) {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string(),
    details: z.string(),
    is_private: z.coerce.boolean(),
  });
  const parse = schema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    details: formData.get('details'),
    is_private: formData.get('is_private'),
  });

  if (!parse.success) {
    return { message: 'Failed to create event series' };
  }

  const data = parse.data;
  const session = await getServerSession(authOptions);

  const eventSeries = await prisma.eventSeries.create({
    data: {
      title: data.title,
      description: data.description,
      details: data.details,
      creator_id: session?.user.id,
      is_private: data.is_private,
    },
  });

  revalidatePath('/');
  redirect(`/workshop/${eventSeries.id}`);
}

export async function editEventSeries(prevState: any, formData: FormData) {
  const schema = z.object({
    id: z.coerce.number(),
    title: z.string().min(1),
    description: z.string(),
    details: z.string(),
    category: z.coerce.number(),
    subcategory: z.coerce.number().optional(),
    tags: z.preprocess(
      (val) => (typeof val === 'string' ? JSON.parse(val) : {}),
      z
        .object({ id: z.string(), text: z.string() })
        .pick({ text: true })
        .array(),
    ),
    is_private: z.preprocess(
      (val) => (typeof val === 'string' ? JSON.parse(val).is_private : {}),
      z.boolean(),
    ),
  });
  const parse = schema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
    description: formData.get('description'),
    details: formData.get('details'),
    category: formData.get('category'),
    subcategory: formData.get('subcategory'),
    tags: formData.get('tags'),
    is_private: formData.get('is_private'),
  });

  if (!parse.success) {
    return { message: 'Failed to update event series' };
  }

  const data = parse.data;
  const session = await getServerSession(authOptions);

  await prisma.eventSeries.update({
    where: { id: data.id },
    data: {
      title: data.title,
      description: data.description,
      details: data.details,
      creator_id: session?.user.id,
      is_private: data.is_private,
      updated_at: new Date(),
      category_id: data.category || null,
      sub_category_id: data.subcategory || null,
    },
  });

  await prisma.eventTagEventSeries.deleteMany({
    where: { event_series_id: data.id },
  });
  if (data.tags !== undefined && data.tags.length > 0) {
    for (let i = 0; i < data.tags.length; i++) {
      const tag = await prisma.eventTag.findUnique({
        where: { text: data.tags[i].text },
      });
      if (!tag) {
        await prisma.eventTag.create({
          data: { text: data.tags[i].text },
        });
      }
      await prisma.eventTagEventSeries.create({
        data: {
          event_series_id: data.id,
          event_tag_text: data.tags[i].text,
        },
      });
    }
  }

  revalidatePath('/event_series/[id]', 'page');
  redirect(`/event_series/${data.id}`);
}

export async function deleteEventSeries({ id }: { id: number }) {
  await prisma.userSeriesLike.deleteMany({
    where: { event_series_id: id },
  });
  await prisma.userSeriesFavorite.deleteMany({
    where: { event_series_id: id },
  });
  await deleteTags({ eventSeriesId: id });
  const events = await prisma.event.findMany({
    where: { event_series_id: id },
  });
  await deleteAllEvents({ events });
  await prisma.eventSeries.delete({
    where: { id },
  });

  revalidatePath('/workshop', 'page');
  redirect(`/workshop`);
}

async function deleteAllEvents({ events }: { events: Event[] }) {
  for (const event of events) {
    await deleteSourceContent({ eventId: event.id });
    await prisma.event.delete({
      where: {
        id: event.id,
      },
    });
  }
}

export async function createEvent(prevState: any, formData: FormData) {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string(),
    eventSeriesId: z.number(),
  });
  const parse = schema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    eventSeriesId: formData.get('eventSeriesId'),
  });

  if (!parse.success) {
    return { message: 'Failed to create event' };
  }

  const data = parse.data;
  const session = await getServerSession(authOptions);

  const eventSeriesEvents = await prisma.event.findMany({
    where: { event_series_id: data.eventSeriesId },
  });

  const lastPosition = eventSeriesEvents.reduce((acc, el) => {
    return acc >= el.event_position ? acc : el.event_position;
  }, 0);

  await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      creator_id: session?.user.id,
      event_series_id: data.eventSeriesId,
      event_position: lastPosition + 1,
    },
  });

  revalidatePath('/');
  redirect(`/event_series/${data.eventSeriesId}`);
}

export async function deleteEvent({ eventId }: { eventId: number }) {
  await deleteSourceContent({ eventId });
  await prisma.event.delete({
    where: {
      id: eventId,
    },
  });
  revalidatePath('/');
}

async function deleteSourceContent({ eventId }: { eventId: number }) {
  const sourceContent = await prisma.sourceContentEvent.findFirst({
    where: { event_id: eventId },
  });

  if (sourceContent) {
    await prisma.sourceContentEvent.delete({
      where: {
        source_content_id_event_id: {
          source_content_id: sourceContent.source_content_id,
          event_id: eventId,
        },
      },
    });

    const count = await prisma.sourceContentEvent.count({
      where: { source_content_id: sourceContent.source_content_id },
    });

    if (count < 1) {
      const commentsExist = await prisma.comment.findFirst({
        where: { source_content_id: sourceContent.source_content_id },
      });
      if (commentsExist) {
        await prisma.comment.delete({
          where: { source_content_id: sourceContent.source_content_id },
        });
      }
      await prisma.sourceContent.delete({
        where: { id: sourceContent.source_content_id },
      });
    }
  }
}

async function deleteTags({ eventSeriesId }: { eventSeriesId: number }) {
  const tags = await prisma.eventTagEventSeries.findMany({
    where: { event_series_id: eventSeriesId },
  });
  await prisma.eventTagEventSeries.deleteMany({
    where: { event_series_id: eventSeriesId },
  });
  for await (const tag of tags) {
    const count = await prisma.eventTagEventSeries.count({
      where: { event_tag_text: tag.event_tag_text },
    });
    if (count < 1) {
      await prisma.eventTag.delete({
        where: { text: tag.event_tag_text },
      });
    }
  }
}
