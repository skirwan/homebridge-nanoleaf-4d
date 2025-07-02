export interface Nanoleaf4DInstance {
  id: string;
  name: string;
}

export interface MirroringStateChangeListener {
  (instanceId: string, isOn: boolean): void;
}

/**
 * Abstraction for interacting with Nanoleaf 4D devices.
 * Actual implementation will handle discovery, pairing and control
 * over the network.
 */
export interface Nanoleaf4DClient {
  /**
   * Return a list of all Nanoleaf 4D instances discoverable on the network.
   */
  enumerateInstances(): Promise<Nanoleaf4DInstance[]>;

  /**
   * Complete the pairing process with a Nanoleaf 4D instance and
   * return a unique identifier used for further commands.
   */
  pair(instance: Nanoleaf4DInstance): Promise<string>;

  /**
   * Enable or disable screen mirroring for a paired instance.
   */
  setMirroring(instanceId: string, on: boolean): Promise<void>;

  /**
   * Query the current mirroring state for a paired instance.
   */
  getMirroringState(instanceId: string): Promise<boolean>;

  /**
   * Register a callback that fires whenever the mirroring state changes.
   */
  onMirroringStateChanged(listener: MirroringStateChangeListener): void;
}
