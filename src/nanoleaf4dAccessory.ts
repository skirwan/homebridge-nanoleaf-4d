import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { Nanoleaf4DPlatform } from './platform.js';
import type { Nanoleaf4DClient } from './nanoleaf4DClient.js';

/**
 * Represents the HomeKit switch accessory for controlling screen mirroring on a
 * Nanoleaf 4D device.
 */
export class Nanoleaf4dAccessory {
  private service: Service;

  constructor(
    private readonly platform: Nanoleaf4DPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly client: Nanoleaf4DClient,
    private readonly instanceId: string,
  ) {
    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nanoleaf')
      .setCharacteristic(this.platform.Characteristic.Model, '4D')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, instanceId);

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
    this.client.onMirroringStateChanged((id, state) => {
      if (id === this.instanceId) {
        this.platform.log.debug(`Update from device ${id}: ${state}`);
        this.service.updateCharacteristic(this.platform.Characteristic.On, state);
      }
    });
  }

  private async handleSetOn(value: CharacteristicValue) {
    const on = value as boolean;
    await this.client.setMirroring(this.instanceId, on);
  }

  private async handleGetOn(): Promise<CharacteristicValue> {
    return this.client.getMirroringState(this.instanceId);
  }
}
