import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { Nanoleaf4DPlatform } from './platform.mjs';
import type { Nanoleaf4DClient } from './nanoleaf4DClient.mjs';
import { PairedNanoleaf4DInstance } from './configuration-types.js';

const EMERSION_MODES = {
  codeToLabel: {
    6: "1D", 2: "2D", 3: "3D", 5: "4D", 0: 'OFF'
  },
  labelToCode: {
    "1D": 6, "2D": 2, "3D": 3, "4D": 5, "OFF": 0
  }
} as const;
type EMERSION_LABEL = keyof typeof EMERSION_MODES.labelToCode;
type EMERSION_CODE = keyof typeof EMERSION_MODES.codeToLabel;

/**
 * Represents the HomeKit switch accessory for controlling screen mirroring on a
 * Nanoleaf 4D device.
 */
export class Nanoleaf4dAccessory {
  private service: Service;

  constructor(
    private readonly platform: Nanoleaf4DPlatform,
    private readonly accessory: PlatformAccessory<PairedNanoleaf4DInstance>,
    private readonly client: Nanoleaf4DClient
  ) {
    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nanoleaf')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.serial);

    // Create or get switch service
    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    // Name
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName);

    // Register handlers
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.handleSetOn.bind(this))
      .onGet(this.handleGetOn.bind(this));

    // Listen for updates from client
    this.client.onMirroringStateChanged((id: string, state: boolean) => {
      if (id === accessory.context.serial) {
        this.platform.log.debug(`Update from device ${id}: ${state}`);
        this.service.updateCharacteristic(this.platform.Characteristic.On, state);
      }
    });
  }

  private async handleSetOn(value: CharacteristicValue) {
    this.platform.log(`Calling handleSetOn: (${value})`)
    const on = value as boolean;
    if (!!value) {
      this.setEmersionMode('4D');
    } else {
      this.setEmersionMode('OFF');
      this.solidColorOn();
    }
  }

  private async handleGetOn(): Promise<CharacteristicValue> {
    const mode = await this.getEmersionMode();
    return mode !== 'OFF';
  }

  private async req(path: string, method: string, body: unknown = undefined): Promise<any | undefined> {
    const req: RequestInit = { method };
    if (body) {
      req.headers = {
        'Content-Type': 'application/json',
      };
      req.body = JSON.stringify(body);
    }

    const { host, port, token } = this.accessory.context;
    const response = await fetch(`http://${host}:${port}/api/v1/${token}/${path}`, req);

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
    const q = await this.req('effects', 'PUT', { "write": { "command": "getScreenMirrorMode" } });

    return EMERSION_MODES.codeToLabel[q.screenMirrorMode as EMERSION_CODE];
  };

  async setEmersionMode(mode: EMERSION_LABEL) {
    const emersion_int = EMERSION_MODES.labelToCode[mode as EMERSION_LABEL];
    await this.req('effects', 'PUT', { "write": { "command": "activateScreenMirror", "screenMirrorMode": emersion_int } });
  };

  async solidColorOn() {
    await this.req('state', 'PUT', { ct: { value: 2722 } });
  }

}
