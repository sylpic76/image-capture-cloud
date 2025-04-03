
import { useState } from 'react';
import { useAssistantMessages } from '@/hooks/useAssistantMessages';

// Add a default export component that App.tsx can use
const IndexPage = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    imageProcessingStatus,
    currentProject,
    setCurrentProject,
    saveConversation,
    clearConversation
  } = useAssistantMessages(true);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Assistant IA (Legacy Page)</h1>
      <p className="mb-4">This is the old index page. Please use the new unified app.</p>
      <a href="/" className="text-blue-500 hover:underline">Go to new app</a>
    </div>
  );
};

export default IndexPage;
