import { useState } from 'react';

import type { AgentRole } from '../../core/types';

interface MessageInputProps {
  role: AgentRole;
  onSend: (content: string) => void;
}

export default function MessageInput({ role, onSend }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Message as ${role}...`}
        rows={2}
      />
      <button onClick={handleSend} disabled={!text.trim()}>
        Send
      </button>
    </div>
  );
}
