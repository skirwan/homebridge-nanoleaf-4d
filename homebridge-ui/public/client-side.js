/*global console*/
/*global homebridge*/
/*global document*/

function unconfiguredInnerHtml(config) {
  return `
    <td>${config.label}</td>
    <td>${config.model || 'Unknown'}</td>
    <td class="text-end">
        <button class="btn btn-primary" data-serial="${config.serial}">Pair</button>
    </td>
`;
}

function configuredInnerHtml(config) {
  return `
    <td><input type="text" value="${config.label}" onblur="updateDeviceLabel(event)"></td>
    <td>${config.model || 'Unknown'}</td>
    <td class="text-end">
        <button class="btn btn-primary" data-serial="${config.serial}" onclick="identify(event)">Identify</button>
        <button class="btn btn-secondary" data-serial="${config.serial}" onclick="unpair(event)">Un-pair</button>
    </td>
`;
}

export function identify(evt) {
  const serial = evt.target.getAttribute('data-serial');
  evt.target.disabled = true;
  homebridge.request('identify', { serial }).finally(() => {
    evt.target.disabled = false;
  });
}

export function unpair(evt) {
  const serial = evt.target.getAttribute('data-serial');
  console.log(`Un-pairing device with serial: ${serial}`);
  evt.target.disabled = true;
  homebridge.request('unpair', { serial }).finally(() => {
    evt.target.parentElement.setAttribute('data-unconfigured', true);
    evt.target.parentElement.innerHTML = unconfiguredInnerHtml({ serial, label: 'Unknown' });
  });
}
(async () => {
  // Map from serial to { row, config }
  let displayedDevices = {};
  // True if the configurations in displayedDevices needs to be written back to the host with homebridge.updatePluginConfig
  //let configNeedsToBeWritten = false;

  // We got a configuration, either from loading the plugin config or from a configChanged event, and we ened to show it in the UI.
  function showConfiguration(config, scanned = false) {
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-serial', config.serial);
    newRow.setAttribute('data-unconfigured', !config.token);
    newRow.innerHTML = config.token ? configuredInnerHtml(config) : unconfiguredInnerHtml(config);

    const existing = displayedDevices[config.serial];
    if (existing) {
      if (scanned) {
        return; 
      } // Don't update if this is a scan result
      existing.row.parentElement.replaceChild(newRow, existing.row);
    } else {
      document.getElementById('instance-list').appendChild(newRow);
    }
    displayedDevices[config.serial] = { row: newRow, config };
  }

  homebridge.addEventListener('configChanged', (event) => {
    event.data.devices.forEach(showConfiguration);
  });

  homebridge.addEventListener('instance-list-update', (event) => {
    event.data.instances.forEach((x) => showConfiguration(x, true));
  });

  let cfg = await homebridge.getPluginConfig();
  console.log('Initial plugin configuration:', cfg);
  if (cfg.length > 0 && cfg[0].devices.length > 0) {
    cfg[0].devices.forEach(showConfiguration);
  }

})();
