import { useState } from 'react';
import { TextArea, IconButton } from '@carbon/react';
import { Send } from '@carbon/react/icons';
import styled from 'styled-components';
import type { AgentRole } from '../../core/types';

interface MessageInputProps {
  role: AgentRole;
  onSend: (content: string) => void;
}

const InputContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--cds-border-subtle);
  background: var(--cds-layer);
`;

const StyledTextArea = styled(TextArea)`
  flex: 1;

  .cds--text-area {
    resize: none;
  }
`;

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
    <InputContainer>
      <StyledTextArea
        id="message-input"
        labelText=""
        hideLabel
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Message as ${role}...`}
        rows={2}
      />
      <IconButton
        label="Send"
        onClick={handleSend}
        disabled={!text.trim()}
        kind="primary"
      >
        <Send />
      </IconButton>
    </InputContainer>
  );
}
