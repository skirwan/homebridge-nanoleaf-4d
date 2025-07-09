import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { Nanoleaf4DClient } from './nanoleaf4DClient.mjs';
import { Nanoleaf4DPlatformConfig, PairedNanoleaf4DInstance } from './configuration-types.js';
import { Nanoleaf4dAccessory } from './nanoleaf4dAccessory.mjs';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * Implementation of the Homebridge platform which publishes a switch
 * accessory for controlling the screen mirroring state of each paired
 * Nanoleaf 4D instance.
 */
export class Nanoleaf4DPlatform implements DynamicPlatformPlugin {
  private readonly client: Nanoleaf4DClient = new Nanoleaf4DClient();
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Serial number -> Switch
  public readonly accessories: Map<string, Nanoleaf4dAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: Nanoleaf4DPlatformConfig,
    public readonly api: API,
  ) {
    this.log('Starting Nanoleaf4DPlatform');
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.api.on('didFinishLaunching', () => {
      this.log('Finished launching, creating devices that have no be loaded from cache...')
      // At this point, all cached accessories should be in the accessories map
      config.devices.forEach((device) => {
        if (!this.accessories.has(device.serial)) {
          this.log(`Creating accessory for Nanoleaf ${device.model} serial ${device.serial}...`);
          const uuid = this.api.hap.uuid.generate(device.serial);
          const accessory = new this.api.platformAccessory<PairedNanoleaf4DInstance>(device.label, uuid);
          accessory.context = { ...device };
          this.accessories.set(device.serial, new Nanoleaf4dAccessory(this, accessory, this.client));
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      })
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    if (isPairedNanoleaf4DInstance(accessory.context)) {
      this.accessories.set(
        accessory.context.serial,
        new Nanoleaf4dAccessory(this, accessory as PlatformAccessory<PairedNanoleaf4DInstance>, this.client)
      );
    } else {
      this.log.info('Accessory context doesn\'t contain config, deleting.');
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}

function isPairedNanoleaf4DInstance(x: unknown): x is PairedNanoleaf4DInstance {
  const q: Partial<PairedNanoleaf4DInstance> = x as any;

  if (!q.host) { return false; }
  if (!q.port) { return false; }
  if (!q.token) { return false; }
  return true;
}