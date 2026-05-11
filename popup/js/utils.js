/**
 * Utility helpers.
 */

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast.
 */
function showToast(message) {
    const toast = elements.toast;
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1500);
}

function getAddressSourceText(source) {
    if (source === 'geoapify') return 'Geoapify';
    if (source === 'openstreetmap') return 'OSM';
    if (source === 'local_verified') return '本地真实池';
    return '本地合成';
}

function getAddressQualityText(confidence) {
    if (confidence === 'high') return '高置信';
    if (confidence === 'medium') return '中置信';
    return '基础';
}

function applyGeneratedAddress(realAddress, options = {}) {
    if (!realAddress || !realAddress.address) return false;

    const forceAddress = options.forceAddress === true;

    if (forceAddress || !lockedFields.has('address')) {
        currentData.address = realAddress.address;
    }

    currentData.addressSource = realAddress.source || 'synthetic';
    currentData.addressConfidence = realAddress.confidence || 'low';
    currentData.addressLastUpdatedAt = new Date().toISOString();

    if (realAddress.city && !lockedFields.has('city')) {
        currentData.city = realAddress.city;
    }
    if (realAddress.state && !lockedFields.has('state')) {
        currentData.state = realAddress.state;
    }
    if (realAddress.zipCode && !lockedFields.has('zipCode')) {
        currentData.zipCode = realAddress.zipCode;
    }
    if (realAddress.country && !lockedFields.has('country')) {
        currentData.country = realAddress.country;
    }

    return true;
}

function sameAddressText(a, b) {
    return String(a || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === String(b || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
}

function getAddressGenerationContext(lockedValues = {}) {
    const country = lockedFields.has('country') && lockedValues.country ? lockedValues.country : currentData.country;
    return {
        country,
        city: lockedFields.has('city') && lockedValues.city ? lockedValues.city : currentData.city,
        state: lockedFields.has('state') && lockedValues.state ? lockedValues.state : currentData.state,
        zipCode: lockedFields.has('zipCode') && lockedValues.zipCode ? lockedValues.zipCode : currentData.zipCode
    };
}

function hasHighConfidenceAddressForContext(context) {
    if (!currentData.address || currentData.addressSource !== 'local_verified' || currentData.addressConfidence !== 'high') {
        return false;
    }

    const normalizedCurrentCountry = window.generators?.normalizeCountry
        ? window.generators.normalizeCountry(currentData.country)
        : currentData.country;
    const normalizedTargetCountry = window.generators?.normalizeCountry
        ? window.generators.normalizeCountry(context.country)
        : context.country;

    if (normalizedCurrentCountry !== normalizedTargetCountry) return false;
    if (context.city && !sameAddressText(currentData.city, context.city)) return false;
    if (context.state && currentData.state && !sameAddressText(currentData.state, context.state)) return false;
    if (context.zipCode && currentData.zipCode && !sameAddressText(currentData.zipCode, context.zipCode)) return false;
    return true;
}

async function generateAddressForCurrentContext(lockedValues = {}, options = {}) {
    if (!window.generators?.generateAddressAsync) return null;

    const context = getAddressGenerationContext(lockedValues);
    if (options.forceRefresh !== true && hasHighConfidenceAddressForContext(context)) {
        return null;
    }

    const allowApi = options.allowApi !== undefined ? options.allowApi : false;

    return await window.generators.generateAddressAsync(
        context.country,
        context.city,
        {
            requireCityMatch: Boolean(context.city),
            allowApi,
            locationContext: {
                state: context.state,
                zipCode: context.zipCode
            }
        }
    );
}

function isAddressApiToggleEnabled() {
    return elements.useAddressApiToggle?.checked === true;
}

async function hasHostPermission(url) {
    try {
        const parsed = new URL(url);
        const originPattern = `${parsed.protocol}//${parsed.host}/*`;
        return await chrome.permissions.contains({ origins: [originPattern] });
    } catch (e) {
        log.error('Permission check failed:', e);
        return false;
    }
}

async function ensureAddressApiPermission(options = {}) {
    if (!isAddressApiToggleEnabled()) return false;
    const requestIfMissing = options.requestIfMissing === true;

    const targets = ['https://nominatim.openstreetmap.org/reverse'];
    if (userSettings.geoapifyKey) {
        targets.unshift('https://api.geoapify.com/v1/geocode/reverse');
    }

    for (const target of targets) {
        const granted = requestIfMissing ? await ensureHostPermission(target) : await hasHostPermission(target);
        if (!granted) {
            if (elements.useAddressApiToggle) {
                elements.useAddressApiToggle.checked = false;
            }
            await saveAddressApiToggle(false);
            if (requestIfMissing) {
                showToast('未授权地址 API，已切回本地地址池');
            }
            return false;
        }
    }

    return true;
}

async function shouldUseAddressApi(options = {}) {
    if (options.allowApi !== true) return false;
    return await ensureAddressApiPermission({
        requestIfMissing: options.requestPermission === true
    });
}

function showAddressUpdatedToast(realAddress) {
    const sourceText = getAddressSourceText(realAddress?.source);
    const qualityText = getAddressQualityText(realAddress?.confidence);
    showToast(`地址已更新 (${sourceText} / ${qualityText})`);
}

/**
 * Copy text to clipboard.
 */
async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        if (btn) {
            btn.classList.add('copied');
            btn.textContent = '✅';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.textContent = '📋';
            }, 1000);
        }
        showToast('已复制到剪贴板');
    } catch (err) {
        log.error('Copy failed:', err);
        showToast('复制失败');
    }
}

/**
 * Copy all generated fields.
 */
async function copyAllToClipboard() {
    updateCurrentDataFromInputs();

    const lines = [
        `姓名: ${currentData.firstName} ${currentData.lastName}`,
        `性别: ${currentData.gender === 'male' ? '男' : '女'}`,
        `生日: ${currentData.birthday}`,
        `用户名: ${currentData.username}`,
        `邮箱: ${currentData.email}`,
        `密码: ${currentData.password}`,
        `电话: ${currentData.phone}`,
        `地址: ${currentData.address}`,
        `城市: ${currentData.city}`,
        `州/省: ${currentData.state}`,
        `邮编: ${currentData.zipCode}`,
        `国家: ${currentData.country}`
    ];

    const text = lines.join('\n');

    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制全部信息');
    } catch (err) {
        log.error('Copy all failed:', err);
        showToast('复制失败');
    }
}

/**
 * Ensure host permission for a URL.
 */
async function ensureHostPermission(url) {
    try {
        const parsed = new URL(url);
        const originPattern = `${parsed.protocol}//${parsed.host}/*`;

        const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
        if (hasPermission) return true;

        return await chrome.permissions.request({ origins: [originPattern] });
    } catch (e) {
        log.error('Permission check failed:', e);
        return false;
    }
}

/**
 * Ensure content script is injected.
 */
async function ensureContentScriptInjected(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [
                'scripts/selectors/common.js',
                'scripts/selectors/japan.js',
                'scripts/content.js'
            ]
        });
        await new Promise(r => setTimeout(r, 200));
    } catch (e) {
        log.error('[GeoFill] Script injection failed:', e);
        throw new Error('无法注入脚本，请刷新页面后重试');
    }
}

/**
 * Send message to content script with auto-injection fallback.
 */
async function sendMessageToTab(tabId, message) {
    try {
        return await chrome.tabs.sendMessage(tabId, message);
    } catch (e) {
        await ensureContentScriptInjected(tabId);
        return await chrome.tabs.sendMessage(tabId, message);
    }
}

/**
 * Toggle lock state for a field.
 */
function toggleLock(fieldName, btn) {
    if (lockedFields.has(fieldName)) {
        lockedFields.delete(fieldName);
        btn.classList.remove('locked');
        btn.textContent = '🔓';
        showToast(`${fieldName} 已解锁`);
    } else {
        lockedFields.add(fieldName);
        btn.classList.add('locked');
        btn.textContent = '🔒';
        showToast(`${fieldName} 已锁定`);
    }
    saveLockedFields();
}

/**
 * Format history timestamp.
 */
function formatHistoryTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Unified error handling
function handleError(error, context = '操作', showToastMsg = true) {
    log.error(`${context}失败:`, error);
    if (showToastMsg) {
        const message = error.message || '未知错误';
        showToast(`${context}失败: ${message.slice(0, 50)}`);
    }
}

function withErrorHandler(fn, context) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error, context);
        }
    };
}

function showLoading(btn, loadingText = '加载中...') {
    if (!btn) return { restore: () => {} };

    const originalText = btn.textContent;
    const originalDisabled = btn.disabled;

    btn.textContent = loadingText;
    btn.disabled = true;
    btn.classList.add('loading');

    return {
        originalText,
        restore: () => {
            btn.textContent = originalText;
            btn.disabled = originalDisabled;
            btn.classList.remove('loading');
        }
    };
}

function showLoadingOverlay(container, message = '加载中...') {
    if (!container) return () => {};

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const textEl = document.createElement('div');
    textEl.className = 'loading-text';
    textEl.textContent = message;

    overlay.appendChild(spinner);
    overlay.appendChild(textEl);

    container.style.position = 'relative';
    container.appendChild(overlay);

    return () => {
        overlay.remove();
    };
}

async function withLoading(btn, loadingText, asyncFn, errorContext = '操作') {
    const loading = showLoading(btn, loadingText);
    try {
        return await asyncFn();
    } catch (error) {
        handleError(error, errorContext);
    } finally {
        loading.restore();
    }
}
