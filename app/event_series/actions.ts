'use server';

import prisma from '@/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export async function createEventSeries(prevState: any, formData: FormData) {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string(),
    is_private: z.coerce.boolean(),
  });
  const parse = schema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
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
      creator_id: session?.user.id,
      is_private: data.is_private,
    },
  });

  revalidatePath('/');
  redirect(`/event_series/${eventSeries.id}`);
}

export async function editEventSeries(prevState: any, formData: FormData) {
  const schema = z.object({
    id: z.coerce.number(),
    title: z.string().min(1),
    description: z.string(),
    is_private: z.coerce.boolean(),
  });
  const parse = schema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
    description: formData.get('description'),
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
      creator_id: session?.user.id,
      is_private: data.is_private,
      updated_at: new Date(),
    },
  });

  revalidatePath('/event_series/[id]', 'page');
  redirect(`/event_series/${data.id}`);
}

export async function deleteEventSeries(prevState: any, formData: FormData) {
  const schema = z.object({
    id: z.coerce.number(),
    title: z.string().min(1),
  });
  const data = schema.parse({
    id: formData.get('id'),
    title: formData.get('title'),
  });

  try {
    await prisma.eventSeries.delete({
      where: { id: data.id },
    });

    revalidatePath('/');
    return { message: `Deleted event series ${data.title}` };
  } catch (e) {
    console.log(e);
    return { message: 'Failed to delete event series' };
  }
}

export async function createEvent(prevState: any, formData: FormData) {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string(),
  });
  const parse = schema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
  });

  if (!parse.success) {
    return { message: 'Failed to create event' };
  }

  const data = parse.data;
  const session = await getServerSession(authOptions);

  const eventSeries = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      // creator_id: session?.user.id,
    },
  });

  revalidatePath('/');
  redirect(`/event_series/${eventSeries.id}`);
}
