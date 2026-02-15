import { DEFAULT_PORT } from '../../../core/constants.js';

export function generateConnectMd(port: number = DEFAULT_PORT): string {
  return `
# Minions Server Connection

Server URL: ws://localhost:${port}
API URL: http://localhost:${port}

## EC2 Setup
When running on EC2, update to:
Server URL: wss://<your-ec2-host>:${port}
API URL: https://<your-ec2-host>:${port}
`;
}
