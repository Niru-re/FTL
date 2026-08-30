export * from './websocket';
import { websocketService } from './websocket';

// Compatibility shim
export const wsClient = {
  connect: () => websocketService.connect(),
  disconnect: () => websocketService.disconnect(),
  on: (event: string, cb: (data: any) => void) => websocketService.subscribe(event, cb),
  onStatusChange: (cb: (connected: boolean) => void) => {
    return websocketService.onStateChange((state) => cb(state === 'CONNECTED'));
  },
  getStatus: () => websocketService.isConnected(),
  subscribeChannel: (channel: string) => websocketService.subscribeChannel(channel)
};
