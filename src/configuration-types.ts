export interface Nanoleaf4DInstance {
  serial: string;
  label: string;
  model: string;
  host: string;
  port: number;
}

export type PairedNanoleaf4DInstance = Nanoleaf4DInstance & {
  token: string;
};

export type Nanoleaf4DPlatformConfig = {
  platform: string;
  name?: string;
  devices: Array<PairedNanoleaf4DInstance>;
}