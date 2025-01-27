import { auth } from '@/app/(auth)/auth';
import { updateChatTitle } from '@/lib/db/queries';
import { type NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  props: any
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title } = await req.json();

    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const id = props.params.id;

    await updateChatTitle({
      id,
      title,
      userId: session.user.id,
    });

    return Response.json({ message: 'Chat title updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating chat title:', error);
    return Response.json({ error: 'Failed to update chat title' }, { status: 500 });
  }
} 