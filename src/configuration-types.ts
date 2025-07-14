export interface Nanoleaf4DInstance {
  serial: string;
  label: string;
  model: string;
  host: string;
  port: number;
  mirroringMode: '1D' | '2D' | '3D' | '4D';
  color: {
    colorMode: 'ct';
    ct: { value: number }
  } | {
    colorMode: 'hs';
    hue: { value: number };
    sat: { value: number };
    brightness: { value: number };
  };
  firmwareRevision: string;
}

export type PairedNanoleaf4DInstance = Nanoleaf4DInstance & {
  token: string;
};

export type Nanoleaf4DPlatformConfig = {
  platform: string;
  name?: string;
  devices: Array<PairedNanoleaf4DInstance>;
}