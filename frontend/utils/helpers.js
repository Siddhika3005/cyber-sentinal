// Helper Functions for CyberSentinal

const Helpers = {
    // Validate email format
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    // Validate URL format
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Get domain from URL
    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return null;
        }
    },
    
    // Extract email from string
    extractEmails(text) {
        const regex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
        return text.match(regex) || [];
    },
    
    // Extract URLs from string
    extractURLs(text) {
        const regex = /(https?:\/\/[^\s]+)/g;
        return text.match(regex) || [];
    },
    
    // Calculate similarity between two strings
    stringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1;
        
        const editDistance = this.getEditDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },
    
    // Levenshtein distance algorithm
    getEditDistance(str1, str2) {
        const costs = [];
        
        for (let i = 0; i <= str1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= str2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[str2.length] = lastValue;
        }
        
        return costs[str2.length];
    },
    
    // Check if domain is similar to popular domain (typosquatting)
    isTyposquatting(domain) {
        const popularDomains = [
            'google.com',
            'facebook.com',
            'amazon.com',
            'microsoft.com',
            'apple.com',
            'paypal.com',
            'twitter.com',
            'linkedin.com',
            'instagram.com',
            'youtube.com'
        ];
        
        for (let popular of popularDomains) {
            const similarity = this.stringSimilarity(domain, popular);
            if (similarity > 0.8 && similarity < 1) {
                return true;
            }
        }
        return false;
    },
    
    // Format timestamp
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    },
    
    // Generate UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // Store data locally
    async storeData(key, data) {
        return new Promise((resolve) => {
            const obj = {};
            obj[key] = data;
            chrome.storage.local.set(obj, resolve);
        });
    },
    
    // Retrieve data locally
    async getData(key) {
        return new Promise((resolve) => {
            chrome.storage.local.get(key, (result) => {
                resolve(result[key]);
            });
        });
    },
    
    // Remove data locally
    async removeData(key) {
        return new Promise((resolve) => {
            chrome.storage.local.remove(key, resolve);
        });
    },
    
    // Clear all storage
    async clearStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(resolve);
        });
    },
    
    // Escape HTML special characters
    escapeHTML(html) {
        const parser = new DOMParser();
        const dom = parser.parseFromString('<!DOCTYPE html><body>' + html, 'text/html');
        return dom.body.textContent || '';
    },
    
    // Debounce function
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}
