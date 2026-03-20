// API Integration Module - Communicates with Flask backend
const API = {
    BASE_URL: 'http://localhost:5000',
    TIMEOUT: 8000,
    cache: {},
    cacheTimeout: 3600000, // 1 hour
    feedbackQueue: [],
    
    /**
     * Send text to backend for spam/scam prediction
     * @param {string} text - Text to analyze
     * @returns {Promise} - Resolves with {prediction: 'spam'|'ham', probability: float}
     */
    async predictScam(text) {
        try {
            if (!text || text.trim().length === 0) {
                return {
                    error: 'Text is required',
                    prediction: null,
                    probability: 0,
                    cached: false
                };
            }

            // Check cache first
            const hash = this.hashText(text);
            if (this.cache[hash] && Date.now() - this.cache[hash].time < this.cacheTimeout) {
                console.log('Using cached prediction');
                return { ...this.cache[hash].data, cached: true };
            }

            const textToSend = text.substring(0, 5000);
            console.log('API: Sending request to /predict endpoint');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

            const response = await fetch(`${this.BASE_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: textToSend }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Status:', response.status, errorText);
                return {
                    error: `API returned status ${response.status}`,
                    prediction: null,
                    probability: 0,
                    cached: false
                };
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            const result = {
                prediction: data.prediction,
                probability: data.probability,
                isSpam: data.prediction === 'spam',
                confidence: Math.round(data.probability * 100),
                cached: false
            };

            // Cache the result
            this.cache[hash] = { data: result, time: Date.now() };
            return result;
        } catch (error) {
            console.error('API Request Failed:', error.message);
            return {
                error: `Backend unavailable: ${error.message}`,
                prediction: null,
                probability: 0,
                isSpam: false,
                cached: false
            };
        }
    },

    /**
     * Send user feedback to backend for model improvement
     * @param {string} text - The message text
     * @param {string} userLabel - 'spam' or 'ham' (user's correct classification)
     * @param {string} modelPrediction - What the model predicted
     * @param {float} modelProbability - Model's confidence
     * @returns {Promise}
     */
    async sendFeedback(text, userLabel, modelPrediction = null, modelProbability = null) {
        try {
            if (!text || !userLabel) {
                console.error('API: Missing text or label for feedback');
                return { status: 'error', message: 'Missing text or label' };
            }

            console.log(`API: Sending feedback - ${userLabel} (model predicted: ${modelPrediction})`);

            const response = await fetch(`${this.BASE_URL}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text.substring(0, 5000),
                    label: userLabel.toLowerCase(),
                    model_prediction: modelPrediction,
                    model_probability: modelProbability
                })
            });

            if (!response.ok) {
                console.error('Feedback submission failed:', response.status);
                return { status: 'error', message: `Status ${response.status}` };
            }

            const data = await response.json();
            console.log('Feedback recorded:', data);
            
            return {
                status: 'success',
                total_feedback: data.total_feedback,
                message: `Feedback recorded. Total: ${data.total_feedback}`
            };
        } catch (error) {
            console.error('Feedback submission failed:', error.message);
            return { status: 'error', message: error.message };
        }
    },

    /**
     * Request model retraining with feedback
     * @param {string} mode - 'feedback_only' or 'combined'
     * @param {number} minSamples - Minimum samples needed
     * @returns {Promise}
     */
    async requestRetraining(mode = 'combined', minSamples = 5) {
        try {
            console.log(`API: Requesting retraining (${mode}, min ${minSamples} samples)`);

            const response = await fetch(`${this.BASE_URL}/retrain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: mode,
                    min_samples: minSamples
                })
            });

            if (!response.ok) {
                console.error('Retraining request failed:', response.status);
                return { status: 'error', message: `Status ${response.status}` };
            }

            const data = await response.json();
            console.log('Retraining response:', data);
            
            return data;
        } catch (error) {
            console.error('Retraining request failed:', error.message);
            return { status: 'error', message: error.message };
        }
    },

    /**
     * Get feedback statistics
     * @returns {Promise}
     */
    async getFeedbackStats() {
        try {
            const response = await fetch(`${this.BASE_URL}/feedback-stats`, {
                method: 'GET'
            });

            if (!response.ok) {
                return { error: 'Failed to get stats' };
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get feedback stats:', error.message);
            return { error: error.message };
        }
    },

    /**
     * Hash text for caching
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    },

    /**
     * Check if backend is available
     * @returns {Promise<boolean>}
     */
    async isBackendAvailable() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${this.BASE_URL}/`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('Backend health check:', response.ok ? 'ONLINE' : 'OFFLINE');
            return response.ok;
        } catch (error) {
            console.error('Backend health check failed:', error.message);
            return false;
        }
    },

    /**
     * Batch analyze multiple texts
     * @param {array} texts - Array of text strings
     * @returns {Promise<array>} - Array of prediction results
     */
    async batchPredict(texts) {
        const results = [];
        for (const text of texts) {
            const result = await this.predictScam(text);
            results.push(result);
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return results;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
