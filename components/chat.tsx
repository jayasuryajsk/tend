'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Globe } from 'lucide-react';

import { ChatHeader } from '@/components/chat-header';
import { PreviewAttachment } from '@/components/preview-attachment';
import type { Vote } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { BidIcon } from './bid-icon';

import { Block } from './block';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { useBlockSelector } from '@/hooks/use-block';
import { PaperclipIcon, GlobeIcon } from './icons';
import { VisibilityType } from './visibility-selector';
import { toast } from 'sonner';

interface ExtendedAttachment extends Attachment {
  isUploading?: boolean;
}

export function Chat({
  id,
  initialMessages,
  selectedModelId,
  selectedVisibilityType = 'public' as VisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
  selectedVisibilityType?: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, modelId: selectedModelId },
    initialMessages,
    experimental_throttle: 100,
    onFinish: () => {
      mutate('/api/history');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<ExtendedAttachment>>([]);
  const isBlockVisible = useBlockSelector((state) => state.isVisible);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        // Show immediate preview
        const tempAttachment = {
          url: URL.createObjectURL(file),
          name: file.name,
          contentType: file.type,
          isUploading: true
        };
        setAttachments(prev => [...prev, tempAttachment]);
        
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const { url, pathname, contentType } = data;
          return {
            url,
            name: pathname,
            contentType
          };
        } else {
          const { error } = await response.json();
          throw new Error(error);
        }
      });

      const uploadedAttachments = await Promise.all(uploadPromises);
      setAttachments(prev => [
        ...prev.filter(a => !a.isUploading),
        ...uploadedAttachments.filter(Boolean)
      ]);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file, please try again!');
      // Remove failed upload previews
      setAttachments(prev => prev.filter(a => !a.isUploading));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedModelId}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        {messages.length === 0 ? (
          <div className="flex flex-col flex-1 bg-white">
            <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-32">
              <div className="w-full max-w-[800px] flex flex-col items-center">
                <BidIcon />
                <h1 className="text-[32px] font-semibold mb-8 text-center font-sans">What can we bid on today?</h1>

                <div className="w-full">
                  <div className="relative flex items-center bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim() !== "") {
                            handleSubmit(undefined, {
                              experimental_attachments: attachments
                            });
                            setAttachments([]);
                          }
                        }
                      }}
                      placeholder="Start typing..."
                      className="flex-1 p-4 bg-transparent outline-none rounded-2xl text-gray-800 placeholder:text-gray-400 resize-none overflow-hidden h-[56px] leading-normal"
                      style={{ minHeight: "56px" }}
                    />
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      multiple
                      accept=".pdf"
                      onChange={handleFileUpload}
                    />
                    <div className="flex items-center gap-3 pr-4">
                      <button 
                        className={`text-gray-400 hover:text-gray-600 transition-colors duration-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <PaperclipIcon size={20} />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                        <GlobeIcon size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="min-h-[100px] transition-all duration-200">
                    {attachments.length > 0 && (
                      <div className="flex flex-row gap-4 flex-wrap mt-4">
                        {attachments.map((attachment, index) => (
                          <PreviewAttachment 
                            key={index} 
                            attachment={attachment} 
                            onDelete={() => {
                              if (!attachment.isUploading) {
                                setAttachments(prev => prev.filter((_, i) => i !== index));
                              }
                            }}
                            isUploading={attachment.isUploading}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </main>
          </div>
        ) : (
          <>
            <Messages
              chatId={id}
              isLoading={isLoading}
              votes={votes}
              messages={messages}
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
              isBlockVisible={isBlockVisible}
            />

            <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
              {!isReadonly && (
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                />
              )}
            </form>
          </>
        )}
      </div>

      <Block
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
