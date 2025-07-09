# homebridge-nanoleaf-4d

This plugin exposes a simple `Switch` accessory for enabling or disabling the
screen mirroring feature of a Nanoleaf 4D.

## Usage

This plugin is designed to be used with Homebridge UI; it features a custom configuration UI that supports discovering and pairing Nanoleaf
4D devices on your network.

## Manual Installation

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
