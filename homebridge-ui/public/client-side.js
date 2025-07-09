/*global console*/
/*global homebridge*/
/*global document*/

function el(tag, attrs, children) {
    const el = document.createElement(tag);
    Object.keys(attrs).forEach(attr => {
        if (attr.startsWith('on')) {
            el.addEventListener(attr.slice(2), attrs[attr])
        } else {
            el.setAttribute(attr, attrs[attr]);
        }
    })

    if (children) {
        if (!Array.isArray(children)) {
            children = [children];
        }

        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else {
                el.appendChild(child);
            }
        });
    }
    return el;
}

function unconfiguredRowContents(config) {
    return [
        el('td', { class: 'align-baseline' }, config.label),
        el('td', { class: 'align-baseline' }, config.host),
        el('td', { class: 'align-baseline text-end' }, [
            el('button', {
                class: 'btn btn-sm btn-success',
                onclick: (evt) => pair(config),
            }, 'Pair')
        ])
    ]
}

async function pair(device) {
    try {
        homebridge.showSpinner();
        const pairResponse = await homebridge.request('/pair', device);
        if (pairResponse.success) {
            homebridge.toast.success('Got token ' + pairResponse.token, 'Success!');
            let config = await homebridge.getPluginConfig();
            if (!config || config.length == 0) {
                config = [{
                    name: 'homebridge-nanoleaf-4d',
                    platform: 'Nanoleaf4DPlatform',
                    devices: [],
                }];
            }
            config[0].devices.push({
                ...device,
                token: pairResponse.token
            });
            await homebridge.updatePluginConfig(config);
            await homebridge.savePluginConfig();
            homebridge.toast.success('Saved updated configuration');

            showConfigurations(config);
        } else {
            throw new Error(pairResponse.errorMessage);
        }
    } catch (error) {
        console.log('Error pairing, caught:', error);
        document.getElementById('pairing-instructions').classList.add('text-success');
        homebridge.toast.error(error.message ?? error, `Failed to pair device`)
    } finally {
        homebridge.hideSpinner();
    }
}

async function identify(evt, device) {
    evt.target.disabled = true;

    try {
        await homebridge.request('/identify', device);
    } finally {
        evt.target.disabled = false;
    }
}

async function unpair(evt) {
    const serial = evt.target.closest('tr').getAttribute('data-serial');
    console.log(`Un-pairing device with serial: ${serial}`);
    evt.target.disabled = true;

    try {
        await homebridge.request('unpair', { serial });
    } finally {
        evt.target.parentElement.setAttribute('data-unconfigured', true);
        evt.target.parentElement.innerHTML = unconfiguredInnerHtml({ serial, label: 'Unknown' });
    }
}

async function updateDeviceLabel(evt) {
    const serial = evt.target.closest('tr').getAttribute('data-serial');
    const newLabel = evt.target.value.trim();
    let originalConfig = await homebridge.getPluginConfig();
    const idx = originalConfig[0].devices.findIndex(device => device.serial === serial);
    if (idx !== -1) {
        if (newLabel !== originalConfig[0].devices[idx].label) {
            originalConfig[0].devices[idx].label = newLabel;
            homebridge.updatePluginConfig(originalConfig);
        }
    }
}

// We got a new set of configurations to display, either from loading the plugin config or from a configChanged event
function showConfigurations(configs) {
    const table = document.getElementById('configuration-table');
    table.innerHTML = '';

    configs.forEach(config => {
        table.appendChild(
            el(
                'tr',
                {
                    id: `configuration-${config.serial}`,
                    'data-serial': config.serial,
                },
                [
                    el('td', { class: 'align-baseline' }, 
                        el('input', {
                            class: 'form-control',
                            type: 'text',
                            value: config.label,
                            onblur: (evt) => updateDeviceLabel(evt, config)
                        })
                    ),
                    el('td', { class: 'align-baseline' }, '#??????'),
                    el('td', { class: 'align-baseline' }, '4D'),
                    el('td', { class: 'align-baseline text-end'}, [
                        el('button', {
                            class: 'btn btn-sm btn-primary',
                            onclick: (evt) => identify(evt, config)
                        }, 'Identify'),
                        el('button', {
                            class: 'btn btn-sm btn-danger',
                            onclick: () => unpair(config)
                        }, 'Un-pair'),
                    ])
                ]
            )
        )
    });

    if (configs.length > 0) {
        document.getElementById('configuration-block').classList.remove('d-none');
    } else {
        document.getElementById('configuration-block').classList.add('d-none');
    }
}

function showPairingList(instances) {
    const table = document.getElementById('pairing-table');
    table.innerHTML = '';
    let anyToShow = false;

    instances.forEach(instance => {
        if (!document.getElementById(`configuration-${instance.serial}`)) {
            anyToShow = true;
            table.appendChild(
                el(
                    'tr',
                    { 'data-serial': instance.serial },
                    unconfiguredRowContents(instance)
                )
            );
        }
    });

    if (anyToShow) {
        document.getElementById('pairing-search-block').classList.add('d-none');
        document.getElementById('pairing-block').classList.remove('d-none');
    } else {
        document.getElementById('pairing-search-block').classList.remove('d-none');
        document.getElementById('pairing-block').classList.add('d-none');
    }
}

(async () => {
    homebridge.addEventListener('configChanged', (event) => {
        showConfigurations(event.data[0].devices);
    });

    homebridge.addEventListener('instance-list-update', (event) => {
        showPairingList(event.data.instances);
    });

    let cfg = await homebridge.getPluginConfig();

    if (cfg.length > 0) {
        if (cfg[0].devices.length > 0) {
            homebridge.hideSpinner();
        }
        showConfigurations(cfg[0].devices);
    }
})();
