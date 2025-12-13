import { getServerEnv } from '@lib/config/env';

interface AzureEnv {
  // Deafults to .env.example values
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_ENDPOINT?: string; // e.g., https://myres.openai.azure.com
  AZURE_OPENAI_DEPLOYMENT?: string; // e.g., gpt-4o-mini
  AZURE_OPENAI_API_VERSION?: string; // e.g., 2024-08-01-preview
}

export function getAzureConfig() {
  const env = getServerEnv() as AzureEnv;
  const apiKey = env.AZURE_OPENAI_API_KEY;
  const endpoint = env.AZURE_OPENAI_ENDPOINT;
  const deployment = env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini';
  const apiVersion = env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview';

  if (!apiKey || !endpoint) {
    throw new Error(
      'Azure OpenAI not configured: missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT',
    );
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const headers = {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  } as const;

  return { url, headers, deployment };
}
