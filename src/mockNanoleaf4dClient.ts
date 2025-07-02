import { EventEmitter } from 'node:events';
import type { Nanoleaf4DClient, Nanoleaf4DInstance, MirroringStateChangeListener } from './nanoleaf4DClient.js';

/**
 * Basic in-memory implementation of the Nanoleaf4DClient interface. This is
 * purely for development and testing purposes and does not communicate with
 * real hardware.
 */
export class MockNanoleaf4DClient implements Nanoleaf4DClient {
  private readonly emitter = new EventEmitter();
  private readonly states = new Map<string, boolean>();

  async enumerateInstances(): Promise<Nanoleaf4DInstance[]> {
    return [{ id: 'demo', name: 'Demo Device' }];
  }

  async pair(instance: Nanoleaf4DInstance): Promise<string> {
    this.states.set(instance.id, false);
    return instance.id;
  }

  async setMirroring(instanceId: string, on: boolean): Promise<void> {
    this.states.set(instanceId, on);
    this.emitter.emit('state', instanceId, on);
  }

  async getMirroringState(instanceId: string): Promise<boolean> {
    return this.states.get(instanceId) ?? false;
  }

  onMirroringStateChanged(listener: MirroringStateChangeListener): void {
    this.emitter.on('state', listener);
  }
}
