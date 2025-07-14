/*global console*/
/*global homebridge*/
/*global document*/

function isElement(element) {
    return element instanceof Element || element instanceof HTMLDocument;
}

function el(tag, attrs, children) {
    const el = document.createElement(tag);

    if (isElement(attrs) || Array.isArray(attrs) || typeof attrs === 'string') {
        children = attrs;
    } else {
        Object.keys(attrs).forEach(attr => {
            if (attr.startsWith('on')) {
                el.addEventListener(attr.slice(2), attrs[attr])
            } else {
                el.setAttribute(attr, attrs[attr]);
            }
        })
    }


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

function hsbToHslCss([h, s, b]) {
    s /= 100;
    b /= 100;

    const l = b * (1 - s / 2);
    const sl = l === 0 || l === 1 ? 0 : (b - l) / Math.min(l, 1 - l);

    const hsl = [
        Math.round(h),
        Math.round(sl * 100),
        Math.round(l * 100)
    ];

    return `hsl(${hsl[0]} ${hsl[1]}% ${hsl[2]}%)`;
}

function rgb(value, onvalue) {
    const oldonvalue = onvalue;
    onvalue = ([h, s, b]) => {
        oldonvalue({
            colorMode: 'hs',
            hue: { value: h },
            sat: { value: s },
            brightness: { value: b }
        });
    }
    let hsb = [value.hue?.value ?? 60, value.saturation?.value ?? 70, value.brightness?.value ?? 100];
    console.log('building with hsb', hsb);

    const elements = {};

    function updateColors([h, s, b]) {
        elements.hue.style.setProperty('--dynamicbackground', `linear-gradient(90deg in hsl longer hue,${hsbToHslCss([0, s, b])} 0%,${hsbToHslCss([360, s, b])} 100%)`);
        elements.sat.style.setProperty('--dynamicbackground', `linear-gradient(90deg in hsl longer hue,${hsbToHslCss([h, 0, b])} 0%,${hsbToHslCss([h, 100, b])} 100%)`);
        elements.brightness.style.setProperty('--dynamicbackground', `linear-gradient(90deg in hsl longer hue,${hsbToHslCss([h, s, 0])} 0%,${hsbToHslCss([h, s, 100])} 100%)`);
    }
    const result = el('div', {
        style: 'margin-bottom: -0.5rem;'
    }, [
        elements.hue = el('input', {
            class: 'form-range form-range-dynamic-track w-100',
            type: 'range',
            min: 0,
            max: 360,
            value: hsb[0],
            oninput: (evt) => {
                evt.stopPropagation();
                hsb[0] = +evt.target.value;
                updateColors(hsb);
                onvalue(hsb);
            }
        }),
        elements.sat = el('input', {
            class: 'form-range form-range-dynamic-track w-100',
            type: 'range',
            min: 0,
            max: 100,
            value: hsb[1],
            oninput: (evt) => {
                evt.stopPropagation();
                hsb[1] = +evt.target.value;
                updateColors(hsb);
                onvalue(hsb);
            }
        }),
        elements.brightness = el('input', {
            class: 'form-range form-range-dynamic-track w-100',
            type: 'range',
            min: 0,
            max: 100,
            value: hsb[2],
            oninput: (evt) => {
                evt.stopPropagation();
                hsb[2] = +evt.target.value;
                updateColors(hsb);
                onvalue(hsb);
            }
        })
    ]);

    updateColors(hsb);

    return result;
}

const colorTempRGBMap = [
    [1200, 242, 162, 83],
    [2525, 244, 183, 117],
    [3850, 247, 208, 163],
    [5175, 252, 238, 226],
    [6500, 208, 220, 252],
];

function colorTemperatureToRGB(kelvin) {
    // Clamp input to expected range
    kelvin = Math.max(1200, Math.min(6500, kelvin));

    // Find surrounding keypoints
    let i = 0;
    while (i < colorTempRGBMap.length - 1 && kelvin > colorTempRGBMap[i + 1][0]) i++;

    const [k1, r1, g1, b1] = colorTempRGBMap[i];
    const [k2, r2, g2, b2] = colorTempRGBMap[i + 1];
    const t = (kelvin - k1) / (k2 - k1);

    const r = Math.round(r1 + t * (r2 - r1));
    const g = Math.round(g1 + t * (g2 - g1));
    const b = Math.round(b1 + t * (b2 - b1));

    return `rgb(${r}, ${g}, ${b})`;
}

function cssColorTempGradient() {
    const x = colorTempRGBMap.map(([, r, g, b]) => `rgb(${r},${g},${b})`).join(',')
    return `linear-gradient(90deg, ${x})`;
}

function hsb(value, onvalue) {
    const max = 6500;
    const min = 1200;

    let temp = 2700;
    if (value.colorMode === 'ct') {
        temp = value.ct.value;
    }

    return el('input', {
        class: 'form-range form-range-temperature w-100',
        type: 'range',
        min,
        max,
        value: temp,
        oninput: (evt) => {
            evt.stopPropagation();
            temp = evt.target.value;
            onvalue({ colorMode: 'ct', ct: { value: temp } });
        }
    });
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
    const devices = configs[0].devices;
    const table = document.getElementById('configuration-table');
    table.innerHTML = '';

    devices.forEach(config => {
        let elements = {};
        function setTab(activeButton, activeContent, inactiveButton, inactiveContent) {
            activeButton.classList.remove('btn-outline-primary');
            activeButton.classList.add('btn-primary');
            activeContent.classList.remove('d-none');

            inactiveButton.classList.remove('btn-primary');
            inactiveButton.classList.add('btn-outline-primary');
            inactiveContent.classList.add('d-none');
        }

        function saveConfig() {
            // Update color of button to match selected color
            homebridge.updatePluginConfig(configs);
        }

        const colorTabActive = config.color.colorMode !== 'ct';
        const colorTabClass = colorTabActive ? 'btn-primary' : 'btn-outline-primary';
        const warmthTabClass = colorTabActive ? 'btn-outline-primary' : 'btn-primary';

        console.log('colorMode:', config.color.colorMode);

        table.appendChild(
            el(
                'tr',
                {
                    id: `configuration-${config.serial}`,
                    'data-serial': config.serial,
                },
                [
                    el('td',
                        el('input', {
                            class: 'form-control form-control-sm',
                            type: 'text',
                            value: config.label,
                            onblur: (evt) => updateDeviceLabel(evt, config)
                        })
                    ),
                    el('td',
                        el('div', { class: 'dropdown ' }, [
                            elements.toggleButton = el('button', {
                                class: 'btn btn-secondary btn-sm dropdown-toggle',
                                type: 'button',
                                'data-bs-toggle': 'dropdown',
                                'data-bs-auto-close': 'outside',
                                'aria-expanded': false
                            }, 'Color'),
                            el('div', { class: 'dropdown-menu p-1', style: 'width: 200px' }, [
                                el('div', { class: 'text-center mb-2' },
                                    el('div', { class: 'btn-group btn-group-xs' }, [
                                        elements.colorTabButton = el('button', {
                                            class: 'btn btn-xs ' + colorTabClass,
                                            onclick: (evt) => {
                                                evt.preventDefault();
                                                evt.stopPropagation();
                                                setTab(elements.colorTabButton, elements.colorTabContent, elements.warmthTabButton, elements.warmthTabContent);
                                            }
                                        }, 'Color'),
                                        elements.warmthTabButton = el('button', {
                                            class: 'btn btn-xs ' + warmthTabClass,
                                            onclick: (evt) => {
                                                evt.preventDefault();
                                                evt.stopPropagation();
                                                setTab(elements.warmthTabButton, elements.warmthTabContent, elements.colorTabButton, elements.colorTabContent);
                                            }
                                        }, 'Warmth')
                                    ])
                                ),
                                elements.colorTabContent = el('div', { class: colorTabActive ? 'colorTab' : 'colorTab d-none' },
                                    rgb(config.color, (c) => {
                                        config.color = c;
                                        saveConfig();
                                    })
                                ),
                                elements.warmthTabContent = el('div', { class: colorTabActive ? 'colorTab d-none' : 'colorTab' },
                                    hsb(config.color, (c) => {
                                        config.color = c;
                                        saveConfig();
                                    })
                                ),
                            ])
                        ])
                    ),
                    el('td', [
                        el('div', { class: 'dropdown' }, [
                            el('button', {
                                class: 'btn btn-secondary btn-sm dropdown-toggle d-block w-100',
                                type: 'button',
                                'data-bs-toggle': 'dropdown',
                                'aria-expanded': false
                            }, config.mirroringMode),
                            el('ul', { class: 'dropdown-menu' }, [
                                el('li', el('a', { class: 'dropdown-item', href: '#' }, '1D')),
                                el('li', el('a', { class: 'dropdown-item', href: '#' }, '2D')),
                                el('li', el('a', { class: 'dropdown-item', href: '#' }, '3D')),
                                el('li', el('a', { class: 'dropdown-item', href: '#' }, '4D')),
                            ])
                        ])
                    ]),
                    el('td', { class: 'text-end' }, [
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
        showConfigurations(data);
    });

    homebridge.addEventListener('instance-list-update', (event) => {
        showPairingList(event.data.instances);
    });

    let cfg = await homebridge.getPluginConfig();

    if (cfg.length > 0) {
        if (cfg[0].devices.length > 0) {
            homebridge.hideSpinner();
        }
        showConfigurations(cfg);
    }
})();
