from flask import Flask, request, jsonify
from flask_cors import CORS

import sys
import os

# Add parent directory to sys.path so we can import model and utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.preprocess import preprocess_text
from model.predict import load_artifacts, predict_spam

app = Flask(__name__)
CORS(app)  # Allow extension to hit API from any domain

try:
    model, vectorizer = load_artifacts()
    print("Model and vectorizer loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model, vectorizer = None, None

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'Missing text field'}), 400
        
    text = data['text']
    
    if model is None or vectorizer is None:
        return jsonify({'error': 'Model not loaded on server side.'}), 500
        
    try:
        result = predict_spam(text, model, vectorizer, preprocess_text)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
