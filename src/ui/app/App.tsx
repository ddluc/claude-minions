import { useState, useEffect, useRef } from 'react';

import type {
  AgentRole,
  AgentState,
  Message,
  Settings,
  ChatMessage,
  AgentStatusMessage
} from '../../core/types';
import {
  DEFAULT_PORT,
  VALID_ROLES,
} from '../../core/constants';
import RolePrompt from './RolePrompt';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const DEFAULT_SETTINGS: Settings = {
  mode: 'dark',
  repos: [],
  roles: Object.fromEntries(
    VALID_ROLES.map((r) => [r, { permissions: { allowBash: true, allowGit: true } }])
  ) as Settings['roles'],
  ssh: '',
  permissions: { allowBash: true, allowGit: true },
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [role, setRole] = useState<AgentRole | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Map<string, AgentState>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:${DEFAULT_PORT}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setMessages((prev) => [
        ...prev,
        { type: 'system', content: 'Connected to server', timestamp: new Date().toISOString() },
      ]);
    };

    ws.onmessage = (event) => {
      try {
        const msg: Message = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);

        if (msg.type === 'agent_status') {
          setAgents((prev) => {
            const next = new Map(prev);
            next.set(msg.role, {
              role: msg.role as AgentRole,
              status: msg.status as AgentState['status'],
              connectedAt: msg.timestamp,
              currentBranch: msg.currentBranch,
            });
            return next;
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setMessages((prev) => [
        ...prev,
        { type: 'system', content: 'Disconnected from server', timestamp: new Date().toISOString() },
      ]);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleRoleSubmit = (selected: AgentRole) => {
    setRole(selected);
    const msg: AgentStatusMessage = {
      type: 'agent_status',
      role: selected,
      status: 'online',
      timestamp: new Date().toISOString(),
    };
    wsRef.current?.send(JSON.stringify(msg));
  };

  const handleSend = (content: string) => {
    if (!role) return;
    const msg: ChatMessage = {
      type: 'chat',
      from: role,
      content,
      timestamp: new Date().toISOString(),
    };
    wsRef.current?.send(JSON.stringify(msg));
    setMessages((prev) => [...prev, msg]);
  };

  if (!role) {
    return <RolePrompt settings={settings} onSubmit={handleRoleSubmit} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Minions</h1>
        <div className="agent-status-bar">
          {Array.from(agents.values()).map((agent) => (
            <span
              key={agent.role}
              className={`agent-badge status-${agent.status}`}
            >
              {agent.role}
            </span>
          ))}
        </div>
      </header>
      <main className="app-main">
        <MessageList messages={messages} />
        <MessageInput role={role} onSend={handleSend} />
      </main>
    </div>
  );
}
