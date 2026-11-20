import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.petcommunicator.app',
  appName: 'Pet Communicator',
  webDir: 'static',
  server: {
    // For native builds, set this to your deployed HTTPS backend URL.
    // Do not use localhost: a phone's localhost is the phone itself.
    url: 'https://REPLACE-WITH-YOUR-HTTPS-DOMAIN',
    cleartext: false
  }
};
export default config;
