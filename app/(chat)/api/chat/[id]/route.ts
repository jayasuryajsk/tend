import { auth } from '@/app/(auth)/auth';
import { updateChatTitleById } from '@/lib/db/queries';
import { type NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  props: any
) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { title } = await req.json();
  const chatId = props.params.id;

  await updateChatTitleById({
    chatId,
    title,
  });

  return Response.json({ message: 'Chat title updated successfully' }, { status: 200 });
} 