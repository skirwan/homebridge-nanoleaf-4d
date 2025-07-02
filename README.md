# homebridge-nanoleaf-4d

This plugin exposes a simple `Switch` accessory for enabling or disabling the
screen mirroring feature of a Nanoleaf 4D setup. Each paired device appears as a
separate accessory in HomeKit allowing you to toggle mirroring from the Home app
or via automations.

The implementation relies on a `Nanoleaf4DClient` interface which abstracts the
communication with the Nanoleaf hardware. A small in-memory mock client is
included for development.

## Nanoleaf4DClient Interface

```
interface Nanoleaf4DClient {
  enumerateInstances(): Promise<Nanoleaf4DInstance[]>;
  pair(instance: Nanoleaf4DInstance): Promise<string>;
  setMirroring(instanceId: string, on: boolean): Promise<void>;
  getMirroringState(instanceId: string): Promise<boolean>;
  onMirroringStateChanged(listener: (id: string, on: boolean) => void): void;
}
```

* `enumerateInstances` discovers devices on the network.
* `pair` performs any authentication required and returns an identifier used for
  subsequent calls.
* `setMirroring` switches the mirroring state.
* `getMirroringState` retrieves the current state.
* `onMirroringStateChanged` allows consumers to listen for state changes coming
  from the device.

An example `MockNanoleaf4DClient` provides a non-networked implementation for
development and testing.

## Usage

Install the plugin globally and add the platform to your Homebridge
`config.json`:

```json
{
  "platforms": [
    {
      "platform": "Nanoleaf4DPlatform",
      "name": "Nanoleaf 4D"
    }
  ]
}
```

When Homebridge starts, every paired Nanoleaf 4D instance will be published as a
switch accessory named "Nanoleaf 4D &lt;name&gt;". Toggling the switch will enable or
disable the screen mirroring mode on that device.
