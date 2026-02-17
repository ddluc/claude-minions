import { useState, useEffect, useRef } from 'react';
import { Header, HeaderName, Content } from '@carbon/react';
import styled from 'styled-components';
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
import { RoleBadge } from './components';
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

const AppShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const HeaderBadges = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 1rem;
`;

const MainContent = styled(Content)`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
`;

export default function App() {
  const [settings] = useState<Settings>(DEFAULT_SETTINGS);
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
    <AppShell>
      <Header aria-label="Claude Minions">
        <HeaderName prefix="">
          Claude Minions
        </HeaderName>
        <HeaderBadges>
          {Array.from(agents.values()).map((agent) => (
            <RoleBadge key={agent.role} role={agent.role} />
          ))}
        </HeaderBadges>
      </Header>
      <MainContent>
        <MessageList messages={messages} />
        <MessageInput role={role} onSend={handleSend} />
      </MainContent>
    </AppShell>
  );
}
