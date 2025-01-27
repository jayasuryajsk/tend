import {
  type Message,
  type Attachment,
  type CoreTool,
  type DataStreamWriter,
  convertToCoreMessages,
  createDataStreamResponse,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import {
  codePrompt,
  systemPrompt,
  updateDocumentPrompt,
} from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from '@/lib/db/queries';
import type { Suggestion } from '@/lib/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';
import type { Session } from 'next-auth';

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 60;

type AllowedTools =
  | 'createDocument'
  | 'updateDocument'
  | 'requestSuggestions'
  | 'getWeather';

const blocksTools: AllowedTools[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

const weatherTools: AllowedTools[] = ['getWeather'];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

interface ToolContext {
  session: Session;
  dataStream: DataStreamWriter;
  model: { id: string; apiIdentifier: string };
}

const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
    );
    const weatherData = await response.json();
    return weatherData;
  },
});

const createDocument = ({ session, dataStream, model }: ToolContext) =>
  tool({
    description: 'Create a document for writing or code creation activities',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(['text', 'code']),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();
      if (!session.user?.id) {
        throw new Error('User not authenticated');
      }
      await saveDocument({
        id,
        userId: session.user.id,
        title,
        content: '',
        kind,
      });
      return { documentId: id };
    },
  });

const updateDocument = ({ session, dataStream, model }: ToolContext) =>
  tool({
    description: 'Update an existing document',
    parameters: z.object({
      documentId: z.string(),
      content: z.string(),
    }),
    execute: async ({ documentId, content }) => {
      if (!session.user?.id) {
        throw new Error('User not authenticated');
      }
      const document = await getDocumentById({ id: documentId });
      if (!document || document.userId !== session.user.id) {
        throw new Error('Document not found');
      }
      await saveDocument({
        id: documentId,
        userId: session.user.id,
        title: document.title,
        content,
        kind: document.kind,
      });
      return { success: true };
    },
  });

const requestSuggestions = ({ session, dataStream, model }: ToolContext) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => {
      if (!session.user?.id) {
        throw new Error('User not authenticated');
      }
      const userId = session.user.id;
      const suggestions: Array<Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>> = [];
      await saveSuggestions({
        suggestions: suggestions.map((suggestion) => ({
          ...suggestion,
          userId,
          createdAt: new Date(),
          documentCreatedAt: new Date(),
        })),
      });
      return { suggestions };
    },
  });

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response('Model not found', { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  const userMessageId = generateUUID();

  await saveMessages({
    messages: [
      { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
    ],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      dataStream.writeData({
        type: 'user-message-id',
        content: userMessageId,
      });

      const result = streamText({
        model: customModel(model.apiIdentifier),
        system: systemPrompt,
        messages: coreMessages,
        maxSteps: 5,
        experimental_activeTools: allTools,
        tools: {
          getWeather,
          createDocument: createDocument({ session, dataStream, model }),
          updateDocument: updateDocument({ session, dataStream, model }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
            model,
          }),
        },
        onFinish: async ({ response }) => {
          if (session.user?.id) {
            try {
              const responseMessagesWithoutIncompleteToolCalls =
                sanitizeResponseMessages(response.messages);
              await saveMessages({
                messages: responseMessagesWithoutIncompleteToolCalls.map(
                  (message) => {
                    const messageId = generateUUID();
                    if (message.role === 'assistant') {
                      dataStream.writeMessageAnnotation({
                        messageIdFromServer: messageId,
                      });
                    }
                    return {
                      id: messageId,
                      chatId: id,
                      role: message.role,
                      content: message.content,
                      createdAt: new Date(),
                    };
                  },
                ),
              });
            } catch (error) {
              console.error('Failed to save chat');
            }
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
