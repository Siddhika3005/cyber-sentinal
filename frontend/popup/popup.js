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
            const tabId = tabs[0].id;
            
            // Get page content from content script
            chrome.tabs.sendMessage(tabId, {action: 'getPageContent'}, (response) => {
                if (response && response.content) {
                    console.log('[Popup] Got page content, sending for analysis');
                    
                    // Scan the actual content using hybrid detection
                    chrome.runtime.sendMessage({
                        action: 'detectScam',
                        data: response.content
                    }, (result) => {
                        if (result && result.result) {
                            console.log('[Popup] Got detection result:', result.result);
                            updateDetectionDisplay(result.result);
                        } else {
                            console.warn('[Popup] No detection result');
                        }
                    });
                } else {
                    console.warn('[Popup] Failed to get page content');
                }
            });
        }
    });
}

function updateDetectionDisplay(result) {
    console.log('[Popup] Updating display with result:', result);
    
    // Handle both old format (URL analysis) and new format (hybrid detection)
    let safetyScore, threatLevel, message, detectedCount = 0;
    
    if (result.isScam !== undefined) {
        // New format: hybrid detection result
        safetyScore = result.safetyConfidence || (100 - result.confidenceScore);
        threatLevel = result.isScam ? 'danger' : 'safe';
        message = result.message;
        detectedCount = result.detectedCount || 0;
    } else {
        // Old format: URL-only analysis
        safetyScore = result.safetyScore || 98;
        threatLevel = result.threatLevel || 'safe';
    }
    
    console.log(`[Popup] Safety: ${safetyScore}%, Threat: ${threatLevel}`);
    
    // Update percentage
    document.getElementById('percentageDisplay').textContent = Math.round(safetyScore) + '%';
    
    // Update status
    const statusText = document.getElementById('statusText');
    const statusElement = document.querySelector('.detection-card .card-header .badge');
    
    if (threatLevel === 'safe') {
        statusText.textContent = 'Page appears safe';
        statusElement.className = 'badge badge-safe';
        statusElement.textContent = 'Safe Site';
        document.getElementById('alertCard').style.display = 'none';
        document.getElementById('threatDetails').style.display = 'none';
    } else if (threatLevel === 'warning') {
        statusText.textContent = 'Potential threats detected ⚠️';
        statusElement.className = 'badge badge-warning';
        statusElement.textContent = 'Warning';
        document.getElementById('alertCard').style.display = 'block';
        document.getElementById('threatDetails').style.display = 'block';
    } else if (threatLevel === 'danger') {
        statusText.textContent = '🚨 PHISHING/SCAM DETECTED';
        statusElement.className = 'badge badge-danger';
        statusElement.textContent = 'Dangerous';
        document.getElementById('alertCard').style.display = 'block';
        document.getElementById('threatDetails').style.display = 'block';
        
        // Show threat details if available
        if (result.findings && Object.keys(result.findings).length > 0) {
            const threatList = document.getElementById('threatList');
            if (threatList) {
                threatList.innerHTML = '';
                Object.entries(result.findings).forEach(([pattern, matches]) => {
                    matches.forEach(type => {
                        const threatItem = document.createElement('div');
                        threatItem.className = 'threat-item';
                        threatItem.innerHTML = `<strong>${type}</strong><br><small>${matches.length} detected</small>`;
                        threatList.appendChild(threatItem);
                    });
                });
            }
        }
    }
    
    // Update scan time
    document.getElementById('scanTime').textContent = 'Last scan: ' + new Date().toLocaleTimeString();
    
    // Log detection methods if available
    if (result.detectionMethods) {
        console.log('[Popup] Detection methods:', result.detectionMethods.join(' + '));
    }
}
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

// ============ FEEDBACK SYSTEM ============

/**
 * Get current page content from background script
 */
function getCurrentPageContent() {
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'getPageContent'}, (response) => {
                    if (response && response.content) {
                        resolve(response.content);
                    } else {
                        resolve('');
                    }
                });
            }
        });
    });
}

/**
 * Store current analysis result for feedback
 */
let currentAnalysis = {
    text: '',
    prediction: null,
    probability: null
};

/**
 * Initialize feedback system
 */
function initializeFeedbackSystem() {
    // Add feedback buttons if modal or other UI elements exist
    const reportPhishingBtn = document.getElementById('reportPhishingBtn');
    const markSafeBtn = document.getElementById('markSafeBtn');
    
    if (reportPhishingBtn) {
        reportPhishingBtn.addEventListener('click', () => {
            submitFeedback('spam');
        });
    }
    
    if (markSafeBtn) {
        markSafeBtn.addEventListener('click', () => {
            submitFeedback('ham');
        });
    }
}

/**
 * Submit feedback to backend
 */
async function submitFeedback(userLabel) {
    try {
        const content = await getCurrentPageContent();
        
        if (!content || content.trim().length === 0) {
            showNotification('Could not get page content for feedback');
            return;
        }

        console.log('[Feedback] Submitting feedback:', {
            label: userLabel,
            contentLength: content.length
        });

        // Send feedback to the API
        chrome.runtime.sendMessage({
            action: 'sendFeedback',
            data: {
                text: content,
                label: userLabel,
                modelPrediction: currentAnalysis.prediction,
                modelProbability: currentAnalysis.probability
            }
        }, (response) => {
            if (response && response.status === 'success') {
                showNotification(`✓ Feedback recorded (Total: ${response.total_feedback})`);
                
                // Show retraining option if enough feedback collected
                if (response.total_feedback >= 5) {
                    showRetrainingOption(response.total_feedback);
                }
            } else {
                showNotification('✗ Failed to send feedback');
            }
        });
    } catch (error) {
        console.error('[Feedback] Error:', error);
        showNotification('Error submitting feedback');
    }
}

/**
 * Show option to retrain model
 */
function showRetrainingOption(feedbackCount) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: #3b82f6;
        color: white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 3000;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div style="margin-bottom: 10px;">
            📊 You have ${feedbackCount} feedback samples. Retrain the model?
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="retrainYes" style="
                padding: 6px 12px;
                background: #22c55e;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-weight: 500;
            ">Yes, Retrain</button>
            <button id="retrainNo" style="
                padding: 6px 12px;
                background: #6b7280;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-weight: 500;
            ">Later</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    document.getElementById('retrainYes').addEventListener('click', () => {
        requestModelRetraining();
        notification.remove();
    });
    
    document.getElementById('retrainNo').addEventListener('click', () => {
        notification.remove();
    });
}

/**
 * Request model retraining from backend
 */
function requestModelRetraining() {
    chrome.runtime.sendMessage({
        action: 'requestRetraining',
        data: {
            mode: 'combined',
            minSamples: 5
        }
    }, (response) => {
        if (response && response.status === 'success') {
            showNotification(`✓ Model retrained! (${response.samples_trained} samples)`);
        } else {
            showNotification('✗ Retraining failed');
        }
    });
}

/**
 * Get feedback statistics
 */
function getFeedbackStats() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: 'getFeedbackStats'
        }, (response) => {
            resolve(response || {});
        });
    });
}

// Initialize feedback system when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initializeFeedbackSystem();
});
