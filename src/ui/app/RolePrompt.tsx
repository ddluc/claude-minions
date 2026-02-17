import { useState } from 'react';

import type { AgentRole, RoleConfig, Settings } from '../../core/types';

interface RolePromptProps {
  settings: Settings;
  onSubmit: (role: AgentRole) => void;
}

export default function RolePrompt({ settings, onSubmit }: RolePromptProps) {
  const [selected, setSelected] = useState<AgentRole | null>(null);

  const roles = Object.entries(settings.roles) as [AgentRole, RoleConfig][];

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
    }
  };

  return (
    <div className="role-prompt">
      <h2>Select Your Role</h2>
      <div className="role-options">
        {roles.map(([role, config]) => (
          <button
            key={role}
            className={`role-option ${selected === role ? 'selected' : ''}`}
            onClick={() => setSelected(role)}
          >
            <strong>{role}</strong>
            {config.systemPrompt && (
              <span className="role-description">{config.systemPrompt}</span>
            )}
          </button>
        ))}
      </div>
      <button
        className="submit-role"
        disabled={!selected}
        onClick={handleSubmit}
      >
        Join as {selected ?? '...'}
      </button>
    </div>
  );
}
