// Background Service Worker

const API_BASE_URL = 'http://localhost:5000';
const API_TIMEOUT = 8000;

chrome.runtime.onInstalled.addListener(() => {
    console.log('CyberSentinal extension installed');
    
    // Initialize default settings
    chrome.storage.local.set({
        realtimeProtection: true,
        showWarnings: true,
        blockPhishing: true,
        advancedAnalytics: true,
        scanHistory: [],
        backendEnabled: true,
        useHybridDetection: true
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request.action);
    
    if (request.action === 'analyzePage') {
        const analysis = analyzePageURL(request.data.url);
        sendResponse({analysis: analysis});
    } else if (request.action === 'reportPhishing') {
        handlePhishingReport(request.data);
        sendResponse({success: true});
    } else if (request.action === 'markSafe') {
        handleMarkSafe(request.data);
        sendResponse({success: true});
    } else if (request.action === 'detectScam') {
        console.log('detectScam action triggered, content length:', request.data.length);
        // Use async detection with backend API
        detectScamContentAsync(request.data).then(result => {
            console.log('Sending response:', result);
            sendResponse({result: result});
        }).catch(error => {
            console.error('Error in detectScam:', error);
            sendResponse({result: {isScam: false, error: error.message}});
        });
        return true; // Keep channel open for async response
    } else if (request.action === 'sendFeedback') {
        handleFeedback(request.data, sendResponse);
        return true; // Keep channel open for async response
    } else if (request.action === 'requestRetraining') {
        requestModelRetraining(request.data, sendResponse);
        return true; // Keep channel open for async response
    } else if (request.action === 'getFeedbackStats') {
        getFeedbackStats(sendResponse);
        return true; // Keep channel open for async response
    }
});

function analyzePageURL(url) {
    const analysis = {
        safetyScore: 98,
        threatLevel: 'safe',
        threats: []
    };
    
    // Basic phishing indicators
    const phishingPatterns = [
        /login|signin|verify|confirm|update|urgent|action required|validate|authenticate/i,
        /secure\d+|bank\d+|amazon\d+|paypal\d+|google\d+/i,
        /bit\.ly|tinyurl|short\.link/i
    ];
    
    let riskScore = 0;
    
    if (url.includes('http://')) {
        riskScore += 20;
        analysis.threats.push('Non-HTTPS connection detected');
    }
    
    phishingPatterns.forEach((pattern, index) => {
        if (pattern.test(url)) {
            riskScore += 15;
            analysis.threats.push('Suspicious URL pattern detected');
        }
    });
    
    // Determine threat level
    analysis.safetyScore = Math.max(0, 100 - riskScore);
    
    if (riskScore >= 50) {
        analysis.threatLevel = 'danger';
    } else if (riskScore >= 25) {
        analysis.threatLevel = 'warning';
    } else {
        analysis.threatLevel = 'safe';
    }
    
    // Log scan
    logScan({
        url: url,
        analysis: analysis,
        timestamp: new Date().toISOString()
    });
    
    return analysis;
}

/**
 * Async detection using hybrid approach: local patterns + backend API
 */
async function detectScamContentAsync(content) {
    console.log('=== DETECTION STARTED ===');
    console.log('Content length:', content.length);
    
    // Step 1: Local pattern detection (fast)
    console.log('Step 1: Running local pattern detection...');
    const localResult = detectScamContentLocal(content);
    console.log('Local detection complete:', localResult);
    
    // Step 2: Backend API detection (more accurate)
    let apiResult = null;
    try {
        // Get settings to check if API is enabled
        console.log('Step 2: Checking if backend is enabled...');
        const settings = await new Promise(resolve => {
            chrome.storage.local.get(['backendEnabled', 'useHybridDetection'], resolve);
        });
        
        console.log('Settings:', settings);
        
        if (settings.backendEnabled !== false) {
            console.log('Step 2: Backend enabled, calling API...');
            apiResult = await callBackendAPI(content);
            console.log('API result:', apiResult);
        } else {
            console.log('Step 2: Backend disabled by settings');
        }
    } catch (error) {
        console.warn('Step 2: Backend check error:', error);
    }
    
    // Step 3: Combine results
    console.log('Step 3: Combining results...');
    const finalResult = combineDetectionResults(localResult, apiResult);
    console.log('=== DETECTION COMPLETE ===');
    console.log('Final result:', finalResult);
    
    return finalResult;
}

/**
 * Local pattern-based detection (fallback) - ENHANCED
 */
function detectScamContentLocal(content) {
    const scamPatterns = [
        // Account Security Threats
        {
            pattern: /your account\s+(has been|is|was)?\s*(locked|suspended|disabled|compromised|flagged)/i,
            type: 'Account Compromise Warning',
            severity: 'CRITICAL'
        },
        {
            pattern: /verify\s+(your\s+)?(?:identity|account|email|password|information)/i,
            type: 'Verification Request',
            severity: 'HIGH'
        },
        {
            pattern: /confirm\s+(your\s+)?(?:password|credit card|banking|identity|email)/i,
            type: 'Confirmation Phishing',
            severity: 'HIGH'
        },
        
        // Financial Threats
        {
            pattern: /(?:update|verify|confirm)\s+(?:payment method|billing info|banking|credit card)|payment failed/i,
            type: 'Financial Information Theft',
            severity: 'HIGH'
        },
        {
            pattern: /(?:suspicious|unusual|unauthorized|illegal)\s+(?:activity|charge|transaction|login)/i,
            type: 'Suspicious Activity Alert',
            severity: 'HIGH'
        },
        {
            pattern: /(?:re-)?activate\s+(?:your\s+)?(?:account|card|service)|reactivate immediately/i,
            type: 'Account Reactivation Scam',
            severity: 'MEDIUM'
        },
        
        // Prize/Reward Scams
        {
            pattern: /(?:congratulations|claim|prize|lottery|winner|reward|inheritance|jackpot)/i,
            type: 'Prize/Lottery Scam',
            severity: 'MEDIUM'
        },
        {
            pattern: /(?:you have won|you are eligible|click to claim)/i,
            type: 'False Prize Notification',
            severity: 'MEDIUM'
        },
        
        // Urgency Tactics
        {
            pattern: /(?:click here|click now|click immediately|act now|verify now)/i,
            type: 'Urgency Tactic - CTA',
            severity: 'MEDIUM'
        },
        {
            pattern: /(?:urgent|immediate|right now|asap|do not delay|act immediately|time limited)/i,
            type: 'Artificial Urgency',
            severity: 'MEDIUM'
        },
        {
            pattern: /(?:within\s+\d+\s+(?:hours|days)|expires|deadline|limited time)/i,
            type: 'Time Pressure',
            severity: 'MEDIUM'
        },
        
        // Deception Tactics
        {
            pattern: /(?:do not share|keep private|do not reply|do not forward)|(?:from|behalf of)\s+(?:apple|amazon|google|microsoft|paypal|bank)/i,
            type: 'Impersonation',
            severity: 'HIGH'
        },
        {
            pattern: /please\s+(?:no longer|do not)\s+(?:share|forward|reply)/i,
            type: 'Information Control',
            severity: 'MEDIUM'
        },
        
        // Tech Support Scams
        {
            pattern: /(?:virus detected|malware|security threat|pop-up|error|warning).*(?:call|contact|click)/i,
            type: 'Tech Support Scam',
            severity: 'MEDIUM'
        },
        {
            pattern: /call.*(?:support|technician|specialist)|1-?800|phone number provided/i,
            type: 'Phone Support Scam',
            severity: 'MEDIUM'
        },
        
        // Credential Harvesting
        {
            pattern: /(?:enter|provide|submit)\s+(?:username|password|pin|cvv|ssn|social security)/i,
            type: 'Credential Harvesting',
            severity: 'CRITICAL'
        },
        {
            pattern: /(?:login|sign in|authenticate)\s+(?:now|here|immediately)/i,
            type: 'Login Phishing',
            severity: 'HIGH'
        },
        
        // Business Email Compromise
        {
            pattern: /(?:wire transfer|urgent payment|invoice|receipt required).*(?:confirm|process|approve)/i,
            type: 'BEC - Payment Request',
            severity: 'HIGH'
        },
        
        // Generic Red Flags
        {
            pattern: /\bclick\s+(?:here|link|button)?\b|(?:https?):\/\/[^\s]+(bit\.ly|tinyurl|goo\.gl|short\.link)/i,
            type: 'Suspicious Link',
            severity: 'MEDIUM'
        },
        {
            pattern: /(?:too good to be true|unbelievable offer|deal|free money|easy money)/i,
            type: 'Too Good To Be True Offer',
            severity: 'LOW'
        }
    ];
    
    let detectedScams = [];
    let severityScore = 0;
    let findings = {};
    
    scamPatterns.forEach(({pattern, type, severity}) => {
        if (pattern.test(content)) {
            detectedScams.push(type);
            
            // Calculate severity score
            const severityMap = { 'CRITICAL': 30, 'HIGH': 20, 'MEDIUM': 10, 'LOW': 5 };
            severityScore += severityMap[severity];
            
            // Track findings
            if (!findings[severity]) findings[severity] = [];
            findings[severity].push(type);
        }
    });
    
    // Deduplicate
    detectedScams = [...new Set(detectedScams)];
    
    const confidenceScore = Math.min(100, severityScore);
    
    return {
        method: 'local',
        isScam: detectedScams.length > 0,
        detectedTypes: detectedScams,
        detectedCount: detectedScams.length,
        confidenceScore: confidenceScore,
        source: 'Pattern Recognition',
        findings: findings
    };
}

/**
 * Call backend API for ML-based detection
 */
async function callBackendAPI(content) {
    try {
        // Truncate content to reasonable length for API
        const textToAnalyze = content.substring(0, 5000);
        
        console.log('API: Initiating connection to http://localhost:5000/predict');
        console.log('API: Text length:', textToAnalyze.length);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('API: Request timeout after 8000ms');
            controller.abort();
        }, 8000);
        
        const response = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: textToAnalyze }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('API: Server returned status', response.status);
            const errorText = await response.text();
            console.error('API: Error response:', errorText);
            return null;
        }

        const data = await response.json();
        console.log('API: Received response:', data);
        
        return {
            method: 'api',
            isSpam: data.prediction === 'spam',
            prediction: data.prediction,
            probability: data.probability,
            confidence: Math.round(data.probability * 100),
            source: 'Machine Learning Model'
        };
    } catch (error) {
        console.error('API: Backend call failed -', error.name, error.message);
        if (error.name === 'AbortError') {
            console.error('API: Request was aborted (timeout)');
        }
        return null;
    }
}

/**
 * Combine local and API results for final verdict
 */
function combineDetectionResults(localResult, apiResult) {
    console.log('Combining results - Local:', localResult, 'API:', apiResult);
    
    // If only local result available (API failed or disabled)
    if (!apiResult || apiResult.error) {
        console.log('Using local detection only');
        return {
            ...localResult,
            isScam: localResult.isScam,
            message: localResult.isScam 
                ? `⚠️ SCAM DETECTED (${localResult.detectedCount} patterns) - Confidence: ${localResult.confidenceScore}% - Pattern Recognition`
                : '✅ No scams detected (Pattern Recognition)',
            detectionMethods: ['Pattern Recognition']
        };
    }
    
    // Both methods available - combine them
    console.log('Using hybrid detection (local + ML)');
    
    const isSuspicious = localResult.isScam || apiResult.isSpam;
    let spamConfidence = 0;  // Confidence it's SPAM (0-100)
    let detectionMethods = [];
    let reasoning = [];
    
    // Weight the scores: 35% local pattern, 65% ML model
    if (localResult.isScam) {
        const localWeight = localResult.confidenceScore * 0.35;
        spamConfidence += localWeight;
        detectionMethods.push('Pattern Recognition');
        reasoning.push(`Patterns found: ${localResult.detectedCount} (${Math.round(localWeight)}% spam confidence)`);
    } else {
        reasoning.push('No local patterns detected (0% spam confidence added)');
    }
    
    // apiResult.confidence is 0-100 for spam probability
    // If isSpam=true, add the confidence; if isSpam=false, add inverse (100-confidence)
    const mlSpamConfidence = apiResult.isSpam ? apiResult.confidence : (100 - apiResult.confidence);
    const mlWeight = mlSpamConfidence * 0.65;
    spamConfidence += mlWeight;
    detectionMethods.push('ML Model');
    reasoning.push(`ML Model: ${apiResult.isSpam ? 'Spam' : 'Legitimate'} (confidence: ${apiResult.confidence}%, ${Math.round(mlWeight)}% spam weight)`);
    
    // Boost confidence if both methods agree
    if (localResult.isScam && apiResult.isSpam) {
        spamConfidence = Math.max(spamConfidence, 85);
        reasoning.push('BOTH methods confirmed spam - HIGH CONFIDENCE');
    }
    
    spamConfidence = Math.min(100, Math.round(spamConfidence));
    
    // Display "safety confidence" - inverse of spam confidence
    const safetyConfidence = 100 - spamConfidence;
    
    const message = isSuspicious 
        ? `⚠️ SCAM DETECTED - Spam Confidence: ${spamConfidence}% (${detectionMethods.join(' + ')})`
        : `✅ Page appears safe - Safety Confidence: ${safetyConfidence}% (${detectionMethods.join(' + ')})`;
    
    return {
        isScam: isSuspicious,
        confidenceScore: spamConfidence,
        safetyConfidence: safetyConfidence,
        detectedTypes: localResult.detectedTypes,
        detectedCount: localResult.detectedCount,
        apiPrediction: apiResult.prediction,
        apiConfidence: apiResult.confidence,
        message: message,
        detectionMethods: detectionMethods,
        source: 'Hybrid Analysis (ML + Pattern)',
        reasoning: reasoning,
        findings: localResult.findings
    };
}

/**
 * Legacy function for backward compatibility
 */
function detectScamContent(content) {
    // Synchronous fallback - returns local detection only
    return detectScamContentLocal(content);
}

function handlePhishingReport(data) {
    chrome.storage.local.get('phishingReports', (result) => {
        const reports = result.phishingReports || [];
        reports.push({
            url: data.url,
            timestamp: data.timestamp,
            status: 'reported'
        });
        chrome.storage.local.set({phishingReports: reports});
    });
}

function handleMarkSafe(data) {
    chrome.storage.local.get('safeSites', (result) => {
        const safeSites = result.safeSites || [];
        if (!safeSites.includes(data.url)) {
            safeSites.push(data.url);
        }
        chrome.storage.local.set({safeSites: safeSites});
    });
}

function logScan(scanData) {
    chrome.storage.local.get('scanHistory', (result) => {
        const history = result.scanHistory || [];
        history.push(scanData);
        // Keep only last 100 scans
        if (history.length > 100) {
            history.shift();
        }
        chrome.storage.local.set({scanHistory: history});
    });
}

// ============ FEEDBACK SYSTEM HANDLERS ============

/**
 * Handle feedback submission to backend
 */
async function handleFeedback(data, sendResponse) {
    try {
        console.log('[Feedback] Submitting feedback to backend:', {
            textLength: data.text.length,
            label: data.label
        });

        const response = await API.sendFeedback(
            data.text,
            data.label,
            data.modelPrediction,
            data.modelProbability
        );

        console.log('[Feedback] Response:', response);
        sendResponse(response);
    } catch (error) {
        console.error('[Feedback] Error:', error);
        sendResponse({status: 'error', message: error.message});
    }
}

/**
 * Request model retraining from backend
 */
async function requestModelRetraining(data, sendResponse) {
    try {
        console.log('[Retrain] Requesting model retraining:', data);

        const response = await API.requestRetraining(
            data.mode || 'combined',
            data.minSamples || 5
        );

        console.log('[Retrain] Response:', response);
        sendResponse(response);
    } catch (error) {
        console.error('[Retrain] Error:', error);
        sendResponse({status: 'error', message: error.message});
    }
}

/**
 * Get feedback statistics from backend
 */
async function getFeedbackStats(sendResponse) {
    try {
        console.log('[Stats] Requesting feedback statistics');

        const response = await API.getFeedbackStats();

        console.log('[Stats] Response:', response);
        sendResponse(response);
    } catch (error) {
        console.error('[Stats] Error:', error);
        sendResponse({error: error.message});
    }
}
