import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { Nanoleaf4DPlatform } from './platform.mjs';
import type { Nanoleaf4DClient } from './nanoleaf4DClient.mjs';
import { PairedNanoleaf4DInstance } from './configuration-types.js';
import { createEventSource } from 'eventsource-client';

const EMERSION_MODES = {
  codeToLabel: {
    6: '1D', 2: '2D', 3: '3D', 5: '4D', 0: 'OFF',
  },
  labelToCode: {
    '1D': 6, '2D': 2, '3D': 3, '4D': 5, 'OFF': 0,
  },
} as const;
type EMERSION_LABEL = keyof typeof EMERSION_MODES.labelToCode;
type EMERSION_CODE = keyof typeof EMERSION_MODES.codeToLabel;

type Event3Payload = {
  events?: Array<{
    attr?: number;
    value?: string;
  }>;
};

/**
 * Represents the HomeKit switch accessory for controlling screen mirroring on a
 * Nanoleaf 4D device.
 */
export class Nanoleaf4dAccessory {
  private service: Service;

  constructor(
    private readonly platform: Nanoleaf4DPlatform,
    private readonly accessory: PlatformAccessory<PairedNanoleaf4DInstance>,
    private readonly client: Nanoleaf4DClient,
  ) {
    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nanoleaf')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.serial)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.firmwareRevision);

    // Create or get switch service
    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    // Name
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName);

    // Register handlers
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.handleSetOn.bind(this))
      .onGet(this.handleGetOn.bind(this));

    setTimeout(this.listenForEvents.bind(this));
  }

  private async listenForEvents() {
    const x = await this.req('', 'GET');
    console.log('******');
    console.log(x);
    console.log('******');
    const { host, port, token } = this.accessory.context;
    const es = createEventSource({
      url: `http://${host}:${port}/api/v1/${token}/events?id=3`,
    });

    this.platform.api.on('shutdown', () => {
      es.close();
    });

    for await (const evt of es) {
      // eslint-disable-next-line eqeqeq
      if (evt.id != '3') {
        continue; 
      }
      try {
        const fields = JSON.parse(evt.data) as Event3Payload;
        if (fields.events?.length === 1) {
          // eslint-disable-next-line eqeqeq
          if (fields.events[0].attr == 1) {
            if (fields.events[0].value === '*Emersion*') {
              this.service.updateCharacteristic(this.platform.Characteristic.On, true);
            } else if (fields.events[0].value) {
              this.service.updateCharacteristic(this.platform.Characteristic.On, false);
            }
          }
        }
      } catch (err) {
        this.platform.log('Error handling Nanoleaf SSE event:', err, evt);
      }
    }

  }

  private async handleSetOn(value: CharacteristicValue): Promise<void> {
    if (value) {
      await this.setEmersionMode('4D');
    } else {
      await this.solidColorOn();
    }
  }

  private async handleGetOn(): Promise<CharacteristicValue> {
    const currentEffect = await this.req('effects/select', 'GET');
    return currentEffect === '*Emersion*';
  }

  private async req(path: string, method: string, body: unknown = undefined): Promise<unknown | undefined> {
    const req: RequestInit = { method };
    if (body) {
      req.headers = {
        'Content-Type': 'application/json',
      };
      req.body = JSON.stringify(body);
    }

    const { host, port, token } = this.accessory.context;
    let response: Response;
    try {
      response = await fetch(`http://${host}:${port}/api/v1/${token}/${path}`, req);
    } catch (err) {
      const msg = `Network error calling accessory at ${host}:${port}`;
      this.platform.log(msg, err);
      throw new Error(`${msg}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
      const msg = `Error response calling accessory: (${response.status}) ${await response.text()}`;
      this.platform.log(msg);
      throw new Error(msg);
    }

    if (response.status === 204) {
      return;
    }

    return await response.json();
  }

  async getEmersionMode() {
    const q = await this.req('effects', 'PUT', { 'write': { 'command': 'getScreenMirrorMode' } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return EMERSION_MODES.codeToLabel[(q as any).screenMirrorMode as EMERSION_CODE];
  };

  async setEmersionMode(mode: EMERSION_LABEL) {
    const emersion_int = EMERSION_MODES.labelToCode[mode as EMERSION_LABEL];
    await this.req('effects', 'PUT', { 'write': { 'command': 'activateScreenMirror', 'screenMirrorMode': emersion_int } });
  };

  async solidColorOn() {
    return this.req('state', 'PUT', { ...this.accessory.context.color });
  }
}
