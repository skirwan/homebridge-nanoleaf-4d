import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { Nanoleaf4DClient } from './nanoleaf4DClient.mjs';

/**
 * Implementation of the Homebridge platform which publishes a switch
 * accessory for controlling the screen mirroring state of each paired
 * Nanoleaf 4D instance.
 */
export class Nanoleaf4DPlatform implements DynamicPlatformPlugin {
  private readonly client: Nanoleaf4DClient = new Nanoleaf4DClient();
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: Map<string, PlatformAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      //this.discoverDevices().catch(err => this.log.error(String(err)));
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  // private async discoverDevices() {
  //   const instances = await this.client.enumerateInstances();
  //   for (const instance of instances) {
  //     const pairedId = await this.client.pair(instance);
  //     const uuid = this.api.hap.uuid.generate(pairedId);
  //     const displayName = `Nanoleaf 4D ${instance.name}`;

  //     const existingAccessory = this.accessories.get(uuid);
  //     if (existingAccessory) {
  //       this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
  //       new Nanoleaf4dAccessory(this, existingAccessory, this.client, pairedId);
  //     } else {
  //       this.log.info('Adding new accessory:', displayName);
  //       const accessory = new this.api.platformAccessory(displayName, uuid);
  //       new Nanoleaf4dAccessory(this, accessory, this.client, pairedId);
  //       this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  //       this.accessories.set(uuid, accessory);
  //     }
  //   }
  // }
}
