import type { API } from 'homebridge';
import { Nanoleaf4DPlatform } from './platform.mjs';
import { PLATFORM_NAME } from './settings.js';

/**
 * Register the Nanoleaf4DPlatform with Homebridge.
 */
export default (api: API) => {
  console.log('****** BLAH');
  api.registerPlatform(PLATFORM_NAME, Nanoleaf4DPlatform);
};
