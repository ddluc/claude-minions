import { useEffect, useRef } from 'react';
import { Tile, Tag, InlineNotification, Link } from '@carbon/react';
import { Document, LogoGithub } from '@carbon/react/icons';
import styled from 'styled-components';
import type { Message } from '../../core/types';
import { RoleBadge } from './components';

interface MessageListProps {
  messages: Message[];
}

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ChatBubble = styled(Tile)`
  max-width: 80%;
  padding: 0.75rem 1rem;
`;

const BubbleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const BubbleContent = styled.p`
  white-space: pre-wrap;
  margin: 0;
  color: var(--cds-text-primary);
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
`;

const EventRow = styled(Tile)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  max-width: 80%;
`;

const Timestamp = styled.time`
  font-size: 0.75rem;
  color: var(--cds-text-helper);
  margin-top: 0.25rem;
  display: block;
`;

const STATUS_TAG_TYPE: Record<string, 'green' | 'red' | 'blue'> = {
  online: 'green',
  offline: 'red',
  working: 'blue',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ListContainer>
      {messages.map((msg, i) => {
        switch (msg.type) {
          case 'chat':
            return (
              <div key={i}>
                <ChatBubble>
                  <BubbleHeader>
                    <RoleBadge role={msg.from} />
                    {msg.to && (
                      <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                        &rarr; {msg.to}
                      </span>
                    )}
                  </BubbleHeader>
                  <BubbleContent>{msg.content}</BubbleContent>
                </ChatBubble>
                <Timestamp>{formatTimestamp(msg.timestamp)}</Timestamp>
              </div>
            );

          case 'agent_status':
            return (
              <StatusRow key={i}>
                <RoleBadge role={msg.role} />
                <Tag type={STATUS_TAG_TYPE[msg.status] ?? 'gray'} size="sm">
                  {msg.status}
                </Tag>
                {msg.currentBranch && (
                  <Tag type="outline" size="sm">
                    {msg.currentBranch}
                  </Tag>
                )}
              </StatusRow>
            );

          case 'task_created':
            return (
              <EventRow key={i}>
                <Document size={16} />
                <RoleBadge role={msg.role} />
                <span style={{ color: 'var(--cds-text-primary)' }}>{msg.taskFile}</span>
              </EventRow>
            );

          case 'pr_created':
            return (
              <EventRow key={i}>
                <LogoGithub size={16} />
                <RoleBadge role={msg.role} />
                <Link href={msg.prUrl} target="_blank" rel="noopener noreferrer">
                  PR #{msg.prNumber}
                </Link>
              </EventRow>
            );

          case 'system':
            return (
              <InlineNotification
                key={i}
                kind="info"
                lowContrast
                hideCloseButton
                subtitle={msg.content}
                title=""
              />
            );

          default:
            return null;
        }
      })}
      <div ref={endRef} />
    </ListContainer>
  );
}
