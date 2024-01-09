'use server';

import prisma from '@/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import z from 'zod';

export async function editUser(prevState: any, formData: FormData) {
  const schema = z.object({
    id: z.coerce.number(),
    name: z.string(),
    username: z.string().min(3),
  });
  const parse = schema.safeParse({
    id: formData.get('id'),
    name: formData.get('display_name'),
    username: formData.get('username'),
  });

  if (!parse.success) {
    return { message: 'Failed to update user' };
  }

  const data = parse.data;

  await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      username: data.username,
      updated_at: new Date(),
    },
  });

  revalidatePath('/user/[id]', 'page');
  return (
    { message: `Updated user ${data.username}` } && redirect(`/user/${data.id}`)
  );
}
