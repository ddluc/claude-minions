import { useEffect, useRef } from 'react';

import type { Message } from '../../core/types';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <div key={i} className={`message message-${msg.type}`}>
          {msg.type === 'chat' && (
            <>
              <span className="message-from">{msg.from}</span>
              {msg.to && <span className="message-to"> → {msg.to}</span>}
              <p className="message-content">{msg.content}</p>
            </>
          )}
          {msg.type === 'agent_status' && (
            <div className="message-status">
              <span className="role">{msg.role}</span>
              <span className={`status status-${msg.status}`}>{msg.status}</span>
              {msg.currentBranch && (
                <span className="branch">on {msg.currentBranch}</span>
              )}
            </div>
          )}
          {msg.type === 'task_created' && (
            <div className="message-task">
              <span className="role">{msg.role}</span>
              <span className="task-file">{msg.taskFile}</span>
            </div>
          )}
          {msg.type === 'pr_created' && (
            <div className="message-pr">
              <span className="role">{msg.role}</span>
              <a href={msg.prUrl} target="_blank" rel="noopener noreferrer">
                PR #{msg.prNumber}
              </a>
            </div>
          )}
          {msg.type === 'system' && (
            <div className="message-system">
              <p>{msg.content}</p>
            </div>
          )}
          <time className="message-time">{msg.timestamp}</time>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
