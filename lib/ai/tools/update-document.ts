import {
  DataStreamWriter,
  smoothStream,
  streamObject,
  streamText,
  tool,
} from 'ai';
import { Model } from '../models';
import { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById, saveDocument } from '@/lib/db/queries';
import { customModel } from '..';
import { updateDocumentPrompt } from '../prompts';

interface UpdateDocumentProps {
  model: Model;
  session: Session;
  dataStream: DataStreamWriter;
}

export const updateDocument = ({
  model,
  session,
  dataStream,
}: UpdateDocumentProps) =>
  tool({
    description: 'Update an existing document with new content.',
    parameters: z.object({
      id: z.string(),
      description: z.string(),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });
      if (!document) {
        throw new Error('Document not found');
      }
      
      const currentContent = document.content;
      let draftText = '';

      dataStream.writeData({
        type: 'id',
        content: id,
      });

      dataStream.writeData({
        type: 'title',
        content: document.title,
      });

      dataStream.writeData({
        type: 'kind',
        content: document.kind,
      });

      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      if (document.kind === 'text') {
        const { fullStream } = streamText({
          model: customModel(model.apiIdentifier),
          system: updateDocumentPrompt(currentContent, 'text'),
          experimental_transform: smoothStream({ chunking: 'word' }),
          prompt: description,
        });

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === 'text-delta') {
            const { textDelta } = delta;

            draftText += textDelta;
            dataStream.writeData({
              type: 'text-delta',
              content: textDelta,
            });
          }
        }

        dataStream.writeData({ type: 'finish', content: '' });
      } else if (document.kind === 'code') {
        const { fullStream } = streamObject({
          model: customModel(model.apiIdentifier),
          system: updateDocumentPrompt(currentContent, 'code'),
          prompt: description,
          schema: z.object({
            code: z.string(),
          }),
        });

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === 'object') {
            const { object } = delta;
            const { code } = object;

            if (code) {
              dataStream.writeData({
                type: 'code-delta',
                content: code ?? '',
              });

              draftText = code;
            }
          }
        }

        dataStream.writeData({ type: 'finish', content: '' });
      }

      if (session.user?.id) {
        await saveDocument({
          id,
          title: document.title,
          kind: document.kind,
          content: draftText,
          userId: session.user.id,
        });
      }

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document was updated and is now visible to the user.',
      };
    },
  });
