import ssdp from '@achingbrain/ssdp';

async function main() {
    const bus = await ssdp()

    bus.on('error', console.error);

    (async () => {
        for await (const svc of bus.discover({ serviceType: 'ssdp:all' })) {
            if (svc.serviceType === 'nanoleaf:nl69') {
                console.log(`Found Nanoleaf 4D device: ${svc.location}`);

                const detailsURL = new URL('device_info', svc.location);
                detailsURL.port = '80';
                const data = await fetch(detailsURL);
                if (data.ok) {
                    const details = await data.json();
                    console.log(`Device details: ${JSON.stringify(details, null, 2)}`);
                }
            }
        }
    })();
    
    // Stop after 10 seconds
    setTimeout(async () => {
        await bus.stop();
        console.log('SSDP stopped');
    }, 10000);
}

main().catch(console.error);