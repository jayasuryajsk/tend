import { useState } from 'react';

interface UseChatTitleProps {
  chatId: string;
  initialTitle: string;
}

export function useChatTitle({ chatId, initialTitle }: UseChatTitleProps) {
  const [title, setLocalTitle] = useState(initialTitle);

  const setTitle = async (newTitle: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to update chat title');
      }

      setLocalTitle(newTitle);
    } catch (error) {
      console.error('Error updating chat title:', error);
      throw error;
    }
  };

  return {
    title,
    setTitle,
  };
} 