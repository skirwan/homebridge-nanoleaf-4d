import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import { Nanoleaf4DClient } from '../nanoleaf4DClient.mjs';
import { Nanoleaf4DInstance, PairedNanoleaf4DInstance } from '../configuration-types.js';

export class Nanoleaf4DPluginUiServer extends HomebridgePluginUiServer {
  private readonly client = new Nanoleaf4DClient(console.error);
    
  constructor() {
    super();

    this.onRequest('/pair', async (device: Nanoleaf4DInstance) => {
      try {
        return await this.client.pair(device.host, device.port);
      } catch (error) {
        return { success: false, errorMessage: String(error) };
      }
    });

    this.onRequest('/identify', async (device: PairedNanoleaf4DInstance) => {
      await this.client.identify(device.host, device.port, device.token);
    });

    this.ready();

    setTimeout(async () => {
      for await (const instances of this.client.instanceList()) {
        this.pushEvent('instance-list-update', {
          instances,
        });
      }
    }, 0);
  }
}
