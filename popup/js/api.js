/**
 * API and location module.
 */

function setIpInfoText(text, isLoading = false) {
    if (!elements.ipInfo) return;
    if (isLoading) {
        elements.ipInfo.classList.add('loading');
        elements.ipInfo.textContent = text;
        return;
    }

    elements.ipInfo.classList.remove('loading');
    elements.ipInfo.textContent = `📍 ${text}`;
}

/**
 * Fetch IP/location info.
 */
async function fetchIPInfo() {
    log.info('Start fetching IP info...');

    setIpInfoText('获取位置中...', true);

    const lockedValues = {};
    lockedFields.forEach(field => {
        lockedValues[field] = currentData[field];
    });

    let country = 'United States';
    let city = 'New York';
    let region = '';
    let success = false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const result = await response.json();
        log.info('ipapi.co response:', result);
        if (result.country_name) {
            country = result.country_name;
            city = result.city || 'Unknown';
            region = result.region || '';
            success = true;
        }
    } catch (e) {
        log.info('ipapi.co failed:', e.message);
    }

    if (!success) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch('https://ipwho.is/', { signal: controller.signal });
            clearTimeout(timeoutId);
            const result = await response.json();
            log.info('ipwho.is response:', result);
            if (result.success !== false && result.country) {
                country = result.country;
                city = result.city || 'Unknown';
                region = result.region || '';
                success = true;
            }
        } catch (e) {
            log.info('ipwho.is failed:', e.message);
        }
    }

    if (!window.generators) {
        log.error('generators not loaded');
        setIpInfoText(`${country} (默认)`);
        return;
    }

    const normalizedCountry = window.generators.normalizeCountry(country);
    log.info('Normalized country:', normalizedCountry);

    ipData = {
        country: normalizedCountry,
        city,
        region
    };

    if (success) {
        if (city === normalizedCountry || city === 'Singapore' || city === 'Hong Kong') {
            setIpInfoText(normalizedCountry);
        } else {
            setIpInfoText(`${city}, ${normalizedCountry}`);
        }
    } else {
        setIpInfoText(`${normalizedCountry} (默认)`);
    }

    currentData = window.generators.generateAllInfoWithSettings(ipData, userSettings);
    log.info('Generated data:', currentData);

    if (await shouldUseAddressApi({ allowApi: true }) && window.generators.generateAddressAsync) {
        try {
            const realAddress = await generateAddressForCurrentContext(lockedValues, {
                allowApi: true
            });
            if (applyGeneratedAddress(realAddress)) {
                showAddressUpdatedToast(realAddress);
            }
        } catch (e) {
            log.info('Address API failed:', e);
        }
    }

    lockedFields.forEach(field => {
        if (lockedValues[field] !== undefined) {
            currentData[field] = lockedValues[field];
        }
    });

    updateUI();
    saveDataToStorage();
}
