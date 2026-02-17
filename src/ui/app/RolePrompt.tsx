import { useState } from 'react';
import { ClickableTile, Button, FlexGrid, Row, Column } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import styled from 'styled-components';
import type { AgentRole, RoleConfig, Settings } from '../../core/types';
import { ROLE_LABEL_COLORS } from '../../core/constants';
import { RoleBadge } from './components';

interface RolePromptProps {
  settings: Settings;
  onSubmit: (role: AgentRole) => void;
}

const RolePromptContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: var(--cds-background);
`;

const Heading = styled.h2`
  color: var(--cds-text-primary);
  margin-bottom: 2rem;
`;

const RoleGrid = styled.div`
  width: 100%;
  max-width: 48rem;
  margin-bottom: 2rem;
`;

const RoleCard = styled(ClickableTile)<{ $borderColor: string; $isSelected: boolean }>`
  border-left: 4px solid #${(props) => props.$borderColor};
  margin-bottom: 0.5rem;
  outline: ${(props) => (props.$isSelected ? `2px solid #${props.$borderColor}` : 'none')};
  outline-offset: -2px;

  &:hover {
    border-left-color: #${(props) => props.$borderColor};
  }
`;

const RoleCardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const RoleDescription = styled.span`
  color: var(--cds-text-secondary);
  font-size: 0.875rem;
`;

export default function RolePrompt({ settings, onSubmit }: RolePromptProps) {
  const [selected, setSelected] = useState<AgentRole | null>(null);

  const roles = Object.entries(settings.roles) as [AgentRole, RoleConfig][];

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
    }
  };

  return (
    <RolePromptContainer>
      <Heading>Select Your Role</Heading>
      <RoleGrid>
        <FlexGrid>
          {roles.map(([role, config]) => (
            <Row key={role}>
              <Column>
                <RoleCard
                  $borderColor={ROLE_LABEL_COLORS[role] ?? 'C6C6C6'}
                  $isSelected={selected === role}
                  onClick={() => setSelected(role)}
                >
                  <RoleCardContent>
                    <RoleBadge role={role} size="md" />
                    {config.systemPrompt && (
                      <RoleDescription>{config.systemPrompt}</RoleDescription>
                    )}
                  </RoleCardContent>
                </RoleCard>
              </Column>
            </Row>
          ))}
        </FlexGrid>
      </RoleGrid>
      <Button
        renderIcon={ArrowRight}
        disabled={!selected}
        onClick={handleSubmit}
        size="lg"
      >
        Join as {selected ?? '...'}
      </Button>
    </RolePromptContainer>
  );
}
