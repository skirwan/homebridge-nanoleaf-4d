import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import { Nanoleaf4DClient } from '../nanoleaf4DClient.mjs';

export class Nanoleaf4DPluginUiServer extends HomebridgePluginUiServer {
  private readonly client = new Nanoleaf4DClient();
    
  constructor() {
    super();

    this.onRequest('/hello', async (payload) => {
      console.log(payload); // the payload sent from the UI
      return { hello: 'user' };
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
