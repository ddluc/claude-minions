import { Tag } from '@carbon/react';
import styled from 'styled-components';
import { ROLE_LABEL_COLORS } from '../../../core/constants';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
}

const StyledTag = styled(Tag)<{ $color: string }>`
  background-color: #${(props) => props.$color};
  color: #161616;
  font-weight: 600;
`;

export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const color = ROLE_LABEL_COLORS[role] ?? 'C6C6C6';
  return (
    <StyledTag size={size} $color={color}>
      {role}
    </StyledTag>
  );
}
