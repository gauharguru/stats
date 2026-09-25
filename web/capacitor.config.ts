import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.ahsnursing.feemanager',
  appName: 'AHS Fee Manager',
  webDir: 'dist-app',
  android: {
    /* the college server is usually plain http on the local network */
    allowMixedContent: true,
  },
  plugins: {
    /* send API calls through Android's native HTTP stack: no CORS / mixed-content problems */
    CapacitorHttp: { enabled: true },
  },
};

export default config;
