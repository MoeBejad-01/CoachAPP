import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { coachSyncApi } from './server/syncApi';

export default defineConfig({
  // coachSyncApi: the local API the iOS trainee app syncs through (see server/syncApi.ts).
  plugins: [react(), coachSyncApi()],
  server: { port: 5173 },
});
