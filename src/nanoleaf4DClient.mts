import ssdp from '@achingbrain/ssdp';
import dgram from 'node:dgram';
import dnsPacket from 'dns-packet';
import { Nanoleaf4DInstance } from './configuration-types.js';

export interface MirroringStateChangeListener {
  (instanceId: string, isOn: boolean): void;
}

export type PairResponse = {
  success: true;
  token: string;
} | {
  success: false;
  errorMessage: string;
};

export function reverseMdns(ip: string, timeout = 2000): Promise<string | undefined> {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  let ipSpec = ip.split('.').reverse().join('.') + '.in-addr.arpa';
  const q = dnsPacket.encode({
    type: 'query',
    id: 0,
    questions: [{ type: 'PTR', name: ipSpec, class: 'IN' }]
  });

  return new Promise((res, rej) => {
    const done = () => { sock.close(); res(undefined); };
    const timer = setTimeout(done, timeout);

    sock
      .on('message', msg => {
        const pkt = dnsPacket.decode(msg);
        for (const a of pkt.answers ?? [])
          if (a.type === 'PTR' && typeof a.data === 'string') {
            if (a.name === ipSpec) {
              clearTimeout(timer);
              sock.close();
              res(a.data);
            }
          }
      })
      .on('error', err => {
        clearTimeout(timer);
        sock.close();
        rej(err);
      })
      .bind(5353, () => {
        sock.addMembership('224.0.0.251');
        sock.setMulticastTTL(255);
        sock.send(q, 0, q.length, 5353, '224.0.0.251');
      });
  });
}

export class Nanoleaf4DClient {
  async *instanceList(): AsyncGenerator<Nanoleaf4DInstance[]> {
    const bus = await ssdp();

    try {
      bus.on('error', console.error);

      for await (const svc of bus.discover({ serviceType: 'ssdp:all' })) {
        if (svc.serviceType === 'nanoleaf:nl69') {
          const url = new URL(svc.location);

          console.log(`Found Nanoleaf 4D device: ${url}`);

          const fqdn = await reverseMdns(url.hostname);

          const detailsURL = new URL('device_info', url);
          detailsURL.port = '80';
          const data = await fetch(detailsURL);
          if (data.ok) {
            const details = await data.json();
            console.log('Device details: ', { fqdn, details });

            yield [{
              host: fqdn ?? url.hostname,
              serial: details.serialNumber,
              label: `Nanoleaf ${details.modelNumber} (${details.serialNumber})`,
              model: details.modelNumber,
              port: parseInt(url.port, 10) || 80,
              mirroringMode: '4D',
              color: { colorMode: 'ct', ct: { value: 2722 } },
              firmwareRevision: details.firmwareVersion,
            }];
          }
        }
      }
    } finally {
      console.log('Stopping SSDP bus');
      await bus.stop();
    }
  }

  async pair(host: string, port: number): Promise<PairResponse> {
    const pairResponse = await fetch(`http://${host}:${port}/api/v1/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (pairResponse.ok) {
      const data = await pairResponse.json();
      return { success: true, token: data.auth_token };
    } else {
      if (pairResponse.status === 403) {
        return { success: false, errorMessage: "Please ensure this device is in pairing mode." };
      }

      const error = await pairResponse.text();
      console.log({
        error,
        status: pairResponse.status,
        statusText: pairResponse.statusText,
        url: pairResponse.url,
      });
      return { success: false, errorMessage: `Unknown pairing error ${pairResponse.status}/${pairResponse.statusText}` };
    }
  }

  async identify(host: string, port: number, token: string): Promise<void> {
    const result = await fetch(`http://${host}:${port}/api/v1/${token}/identify`, {
      method: 'PUT',
    });

    if (result.ok) {
      console.log('Sent identify successfully');
    } else {
      console.log('Identify request failed', {
        host, 
        port, 
        token, 
        status: result.status, 
        statusText: result.statusText,
        payload: await result.text(),
      });
    }
  }
}
