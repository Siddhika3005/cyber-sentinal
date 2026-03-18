// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('CyberSentinal extension installed');
    
    // Initialize default settings
    chrome.storage.local.set({
        realtimeProtection: true,
        showWarnings: true,
        blockPhishing: true,
        advancedAnalytics: true,
        scanHistory: []
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        const result = detectScamContent(request.data);
        sendResponse({result: result});
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

function detectScamContent(content) {
    const scamPatterns = [
        {
            pattern: /your account has been locked|verify your identity|confirm your password/i,
            type: 'Account Lockdown Scam'
        },
        {
            pattern: /congratulations you won|claim your prize|verify your eligibility/i,
            type: 'Prize/Lottery Scam'
        },
        {
            pattern: /confirm your banking details|update payment method|billing information/i,
            type: 'Financial Information Theft'
        },
        {
            pattern: /click here immediately|act now|urgent action required/i,
            type: 'Urgency Tactic'
        },
        {
            pattern: /verify your email|confirm your account|unusual activity detected/i,
            type: 'Phishing Attack'
        }
    ];
    
    let detectedScams = [];
    let confidenceScore = 0;
    
    scamPatterns.forEach(({pattern, type}) => {
        if (pattern.test(content)) {
            detectedScams.push(type);
            confidenceScore += 20;
        }
    });
    
    return {
        isScam: detectedScams.length > 0,
        detectedTypes: detectedScams,
        confidenceScore: Math.min(100, confidenceScore),
        message: detectedScams.length > 0 
            ? `Detected ${detectedScams.length} scam pattern(s): ${detectedScams.join(', ')}`
            : 'No scams detected'
    };
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
