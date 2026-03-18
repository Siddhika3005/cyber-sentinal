// Content Script - Runs on every webpage
console.log('CyberSentinal content script loaded');

const scamDetector = {
    init() {
        this.scanPage();
        this.observePageChanges();
        this.injectFloatingBadge();
    },
    
    scanPage() {
        const pageContent = document.body.innerText;
        
        chrome.runtime.sendMessage({
            action: 'detectScam',
            data: pageContent
        }, (response) => {
            if (response && response.result && response.result.isScam) {
                this.highlightScamPatterns(pageContent);
                this.showWarningBadge(response.result);
            }
        });
    },
    
    highlightScamPatterns(content) {
        const scamKeywords = [
            'verify your account',
            'confirm identity',
            'urgent action',
            'account locked',
            'unusual activity',
            'click here immediately'
        ];
        
        const bodyText = document.body.innerHTML;
        let highlightedContent = bodyText;
        
        scamKeywords.forEach(keyword => {
            const regex = new RegExp(`(${keyword})`, 'gi');
            highlightedContent = highlightedContent.replace(
                regex,
                '<mark style="background: rgba(239, 68, 68, 0.3); border: 1px solid #ef4444; padding: 2px;">$1</mark>'
            );
        });
        
        document.body.innerHTML = highlightedContent;
    },
    
    injectFloatingBadge() {
        if (document.getElementById('cyber-sentinal-badge')) return;
        
        const badge = document.createElement('div');
        badge.id = 'cyber-sentinal-badge';
        badge.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
            transition: all 0.3s ease;
        `;
        badge.innerHTML = '🛡️';
        badge.addEventListener('mouseover', () => {
            badge.style.transform = 'scale(1.1)';
            badge.style.boxShadow = '0 6px 20px rgba(30, 64, 175, 0.5)';
        });
        badge.addEventListener('mouseout', () => {
            badge.style.transform = 'scale(1)';
            badge.style.boxShadow = '0 4px 12px rgba(30, 64, 175, 0.3)';
        });
        badge.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'openPopup'});
        });
        document.body.appendChild(badge);
    },
    
    showWarningBadge(result) {
        // This could trigger a visible warning on the page
        console.warn('Scam detected:', result);
    },
    
    observePageChanges() {
        const observer = new MutationObserver(() => {
            // Scan for newly added content
            this.scanForDynamicContent();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    },
    
    scanForDynamicContent() {
        // This would scan for dynamically loaded content
        const inputFields = document.querySelectorAll('input[type="password"], input[type="text"]');
        inputFields.forEach(field => {
            if (!field.hasAttribute('data-cyber-sentinel-checked')) {
                field.setAttribute('data-cyber-sentinel-checked', 'true');
                field.addEventListener('focus', () => {
                    this.validateFormContext(field);
                });
            }
        });
    },
    
    validateFormContext(field) {
        const form = field.closest('form');
        if (form) {
            const formText = form.innerText.toLowerCase();
            
            const suspiciousPatterns = [
                'verify',
                'confirm identity',
                'urgent',
                'locked',
                'unusual activity'
            ];
            
            const isSuspicious = suspiciousPatterns.some(pattern => 
                formText.includes(pattern)
            );
            
            if (isSuspicious) {
                field.style.borderColor = '#ef4444';
                field.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.3)';
            }
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        scamDetector.init();
    });
} else {
    scamDetector.init();
}
