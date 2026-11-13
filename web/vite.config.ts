import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAiTraining } from './server/aiTraining.ts';

/** Serves the AI file-reading endpoint from the dev and preview servers. */
function aiApi(): Plugin {
  return {
    name: 'coachhq-ai-api',
    configureServer(server) { server.middlewares.use('/api/ai/parse-training', (req, res) => void handleAiTraining(req, res)); },
    configurePreviewServer(server) { server.middlewares.use('/api/ai/parse-training', (req, res) => void handleAiTraining(req, res)); },
  };
}

export default defineConfig(({ mode }) => {
  // Server-only secrets from .env.local (no VITE_ prefix, so they never reach the browser bundle).
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  return {
    plugins: [react(), aiApi()],
    server: { port: 5173 },
  };
});
