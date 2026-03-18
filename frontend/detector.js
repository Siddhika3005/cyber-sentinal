// Detector Module - Scam Detection Engine
const Detector = {
    // Phishing patterns
    phishingPatterns: {
        urgency: /urgent|immediate|act now|right now|don't delay/i,
        verification: /verify|confirm|validate|authenticate|validate identity/i,
        financial: /account|password|credit card|banking|payment|billing/i,
        deception: /congratulations|claim|prize|winner|reward|inheritance/i
    },
    
    // Suspicious email domains
    suspiciousDomains: [
        'noreply',
        'notification',
        'alert',
        'security',
        'verify',
        'confirm'
    ],
    
    // URL analysis
    analyzeURL(url) {
        const analysis = {
            isPhishing: false,
            riskScore: 0,
            indicators: []
        };
        
        // Check for HTTP instead of HTTPS
        if (url.startsWith('http://')) {
            analysis.riskScore += 30;
            analysis.indicators.push('Non-secure HTTP connection');
        }
        
        // Check URL length
        if (url.length > 75) {
            analysis.riskScore += 10;
            analysis.indicators.push('Unusually long URL');
        }
        
        // Check for suspicious patterns
        if (/@/.test(url)) {
            analysis.riskScore += 25;
            analysis.indicators.push('@ symbol in URL');
        }
        
        // Check for IP address
        if (/\d+\.\d+\.\d+\.\d+/.test(url)) {
            analysis.riskScore += 20;
            analysis.indicators.push('IP address used instead of domain');
        }
        
        // Check for URL shorteners
        if (/(bit\.ly|tinyurl|goo\.gl|short\.link)/.test(url)) {
            analysis.riskScore += 15;
            analysis.indicators.push('URL shortener detected');
        }
        
        analysis.isPhishing = analysis.riskScore >= 40;
        
        return analysis;
    },
    
    // Email content analysis
    analyzeEmailContent(content) {
        const analysis = {
            score: 0,
            detectedPatterns: [],
            riskLevel: 'safe'
        };
        
        // Check for urgency patterns
        if (this.phishingPatterns.urgency.test(content)) {
            analysis.score += 20;
            analysis.detectedPatterns.push('urgency tactic');
        }
        
        // Check for verification requests
        if (this.phishingPatterns.verification.test(content)) {
            analysis.score += 25;
            analysis.detectedPatterns.push('verification request');
        }
        
        // Check for financial information requests
        if (this.phishingPatterns.financial.test(content)) {
            analysis.score += 20;
            analysis.detectedPatterns.push('financial information request');
        }
        
        // Check for deception tactics
        if (this.phishingPatterns.deception.test(content)) {
            analysis.score += 15;
            analysis.detectedPatterns.push('deception tactic');
        }
        
        // Determine risk level
        if (analysis.score >= 60) {
            analysis.riskLevel = 'high';
        } else if (analysis.score >= 40) {
            analysis.riskLevel = 'medium';
        } else {
            analysis.riskLevel = 'low';
        }
        
        return analysis;
    },
    
    // Website reputation check
    checkWebsiteReputation(url) {
        return {
            url: url,
            reputation: 'good',
            lastUpdated: new Date().toISOString(),
            reports: 0
        };
    },
    
    // Validate email header
    validateEmailHeader(headers) {
        const analysis = {
            isAuthenticated: false,
            spfPass: false,
            dkimPass: false,
            dmarc: 'none'
        };
        
        // This would typically involve checking SPF, DKIM, DMARC records
        
        return analysis;
    },
    
    // Check for malware signatures
    checkMalwareSignatures(url) {
        return {
            hasMalware: false,
            signatures: [],
            lastScanned: new Date().toISOString()
        };
    },
    
    // Behavioral analysis
    analyzeBehavior(data) {
        const analysis = {
            suspiciousBehaviors: [],
            riskScore: 0
        };
        
        // Check for rapid page reloads
        if (data.reloadCount > 3) {
            analysis.suspiciousBehaviors.push('Rapid page reloads');
            analysis.riskScore += 10;
        }
        
        // Check for form hijacking attempts
        if (data.formCount > 5) {
            analysis.suspiciousBehaviors.push('Multiple form submissions');
            analysis.riskScore += 15;
        }
        
        // Check for unusual JavaScript execution
        if (data.jsExecutionCount > 100) {
            analysis.suspiciousBehaviors.push('Excessive script execution');
            analysis.riskScore += 20;
        }
        
        return analysis;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Detector;
}
