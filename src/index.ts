import type { API } from 'homebridge';
import { Nanoleaf4DPlatform } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * Register the Nanoleaf4DPlatform with Homebridge.
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, Nanoleaf4DPlatform);
};
