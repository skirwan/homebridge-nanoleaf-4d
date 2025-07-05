import ssdp from '@achingbrain/ssdp';

export interface Nanoleaf4DInstance {
  serial: string;
  label: string;
  model: string;
  ip: string;
  port: number;
}

export interface MirroringStateChangeListener {
  (instanceId: string, isOn: boolean): void;
}

export class Nanoleaf4DClient {
  async *instanceList(): AsyncGenerator<Nanoleaf4DInstance[]> {
    const bus = await ssdp()

    try {
      bus.on('error', console.error);

      for await (const svc of bus.discover({ serviceType: 'ssdp:all' })) {
        if (svc.serviceType === 'nanoleaf:nl69') {
          const url = new URL(svc.location);

          console.log(`Found Nanoleaf 4D device: ${url}`);

          const detailsURL = new URL('device_info', url);
          detailsURL.port = '80';
          const data = await fetch(detailsURL);
          if (data.ok) {
            const details = await data.json();
            console.log(`Device details: ${JSON.stringify(details, null, 2)}`);

            yield [{
              serial: details.serialNumber,
              label: `Nanoleaf ${details.modelNumber} (${details.serialNumber})`,
              model: details.modelNumber,
              ip: url.hostname,
              port: parseInt(url.port, 10) || 80
            }];
          }
        }
      }
    } finally {
      console.log('Stopping SSDP bus');
      await bus.stop();
    }
  }

  async pair(instance: Nanoleaf4DInstance): Promise<string> {
    return instance.serial;
  }

  async setMirroring(instanceId: string, on: boolean): Promise<void> {

  }

  async getMirroringState(instanceId: string): Promise<boolean> {
    return false;
  }

  onMirroringStateChanged(listener: MirroringStateChangeListener): void {
    // No-op
  }
}
