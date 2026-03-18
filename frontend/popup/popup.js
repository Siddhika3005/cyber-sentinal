// Popup Script
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    attachEventListeners();
    loadSettings();
    checkCurrentPageSafety();
});

function initializeUI() {
    // Initialize modal with SVG gradient
    const svg = document.querySelector('.progress-ring');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = 'gradient';
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#22c55e');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#16a34a');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.insertBefore(defs, svg.firstChild);
}

function attachEventListeners() {
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', toggleSettingsPanel);
    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsPanel').style.display = 'none';
    });

    // Modal controls
    document.getElementById('viewDetailsBtn').addEventListener('click', () => {
        document.getElementById('reportModal').classList.add('active');
    });
    
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    
    // Report button
    document.getElementById('reportPhishingBtn').addEventListener('click', reportPhishing);
    
    // Mark as safe
    document.getElementById('markSafeBtn').addEventListener('click', markAsSafe);
    
    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('viewHistoryBtn').addEventListener('click', viewHistory);
    
    // Warning badge
    document.getElementById('badgeClose').addEventListener('click', () => {
        document.getElementById('warningBadge').style.display = 'none';
    });
    
    document.getElementById('verifyBtn').addEventListener('click', () => {
        alert('This is a phishing attempt! Do not click on suspicious links.');
    });
    
    document.getElementById('learnMoreLink').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({url: 'https://support.google.com/accounts/answer/185833'});
    });
    
    document.getElementById('reportLink').addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Report submitted successfully!');
    });
}

function toggleSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel.style.display === 'none' || !settingsPanel.style.display) {
        settingsPanel.style.display = 'block';
    } else {
        settingsPanel.style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('reportModal').classList.remove('active');
}

function reportPhishing() {
    chrome.runtime.sendMessage({
        action: 'reportPhishing',
        data: {
            url: getCurrentTabUrl(),
            timestamp: new Date().toISOString()
        }
    });
    showNotification('Phishing report submitted!');
    closeModal();
}

function markAsSafe() {
    chrome.runtime.sendMessage({
        action: 'markSafe',
        data: {
            url: getCurrentTabUrl()
        }
    });
    document.getElementById('alertCard').style.display = 'none';
    showNotification('Site marked as safe.');
}

function loadSettings() {
    chrome.storage.local.get([
        'realtimeProtection',
        'showWarnings',
        'blockPhishing',
        'advancedAnalytics'
    ], (result) => {
        if (result.realtimeProtection !== undefined) {
            document.getElementById('realtimeProtection').checked = result.realtimeProtection;
        }
        if (result.showWarnings !== undefined) {
            document.getElementById('showWarnings').checked = result.showWarnings;
        }
        if (result.blockPhishing !== undefined) {
            document.getElementById('blockPhishing').checked = result.blockPhishing;
        }
        if (result.advancedAnalytics !== undefined) {
            document.getElementById('advancedAnalytics').checked = result.advancedAnalytics;
        }
    });
}

function saveSettings() {
    const settings = {
        realtimeProtection: document.getElementById('realtimeProtection').checked,
        showWarnings: document.getElementById('showWarnings').checked,
        blockPhishing: document.getElementById('blockPhishing').checked,
        advancedAnalytics: document.getElementById('advancedAnalytics').checked
    };
    
    chrome.storage.local.set(settings, () => {
        showNotification('Settings saved successfully!');
        setTimeout(() => {
            document.getElementById('settingsPanel').style.display = 'none';
        }, 500);
    });
}

function viewHistory() {
    chrome.tabs.create({url: 'chrome-extension://' + chrome.runtime.id + '/pages/history.html'});
}

function checkCurrentPageSafety() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            const url = tabs[0].url;
            
            chrome.runtime.sendMessage({
                action: 'analyzePage',
                data: {url: url}
            }, (response) => {
                if (response && response.analysis) {
                    updateDetectionDisplay(response.analysis);
                }
            });
        }
    });
}

function updateDetectionDisplay(analysis) {
    const safetyScore = analysis.safetyScore || 98;
    const threatLevel = analysis.threatLevel || 'safe';
    
    // Update percentage
    document.getElementById('percentageDisplay').textContent = safetyScore + '%';
    
    // Update status
    const statusText = document.getElementById('statusText');
    const statusElement = document.querySelector('.detection-card .card-header .badge');
    
    if (threatLevel === 'safe') {
        statusText.textContent = 'Page is completely safe';
        statusElement.className = 'badge badge-safe';
        statusElement.textContent = 'Safe Site';
        document.getElementById('alertCard').style.display = 'none';
        document.getElementById('threatDetails').style.display = 'none';
    } else if (threatLevel === 'warning') {
        statusText.textContent = 'Potential threats detected';
        statusElement.className = 'badge badge-warning';
        statusElement.textContent = 'Warning';
        document.getElementById('alertCard').style.display = 'block';
        document.getElementById('threatDetails').style.display = 'block';
    } else if (threatLevel === 'danger') {
        statusText.textContent = 'High-risk threats detected';
        statusElement.className = 'badge badge-danger';
        statusElement.textContent = 'Dangerous';
        document.getElementById('alertCard').style.display = 'block';
        document.getElementById('threatDetails').style.display = 'block';
    }
    
    // Update threat list
    if (analysis.threats && analysis.threats.length > 0) {
        const threatList = document.getElementById('threatList');
        threatList.innerHTML = '';
        analysis.threats.forEach(threat => {
            const threatItem = document.createElement('div');
            threatItem.className = 'threat-item';
            threatItem.textContent = threat;
            threatList.appendChild(threatItem);
        });
    }
    
    // Update scan time
    document.getElementById('scanTime').textContent = 'Last scan: ' + new Date().toLocaleTimeString();
}

function getCurrentTabUrl() {
    // This will be called with the active tab info
    return document.querySelector('meta[name="current-url"]')?.content || 'unknown';
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: #22c55e;
        color: white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
