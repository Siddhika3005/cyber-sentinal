from flask import Flask, request, jsonify
from flask_cors import CORS

import sys
import os
import re

# Add parent directory to sys.path so we can import model and utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.preprocess import preprocess_text
from model.predict import load_artifacts, predict_spam
from feedback import FeedbackManager
from self_trainer import SelfTrainer

app = Flask(__name__)
CORS(app)  # Allow extension to hit API from any domain

# Initialize feedback and self-trainer
feedback_manager = FeedbackManager()
self_trainer = SelfTrainer(feedback_manager=feedback_manager)

try:
    model, vectorizer = load_artifacts()
    print("Model and vectorizer loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model, vectorizer = None, None

def has_scam_keywords(text):
    """Quick heuristic check for obvious scam keywords"""
    scam_keywords = [
        r'click.*immediate',
        r'verify.*account|account.*verify',
        r'confirm.*password|password.*confirm',
        r'unusual.*activity|activity.*unusual',
        r'account.*locked|locked.*account',
        r'congratulations.*won|won.*prize',
        r'claim.*prize|prize.*claim',
        r'update.*payment|payment.*method',
        r'suspicious.*transaction|unauthorized.*charge',
        r'act now|urgent action|immediate action',
        r'do not share|keep secret',
        r're-?activate.*account',
    ]
    
    text_lower = text.lower()
    matches = 0
    for pattern in scam_keywords:
        if re.search(pattern, text_lower):
            matches += 1
    
    return matches > 0, matches

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "running", "message": "Cyber Sentinel API is up and running. Use the /predict endpoint to scan messages."})

@app.route('/predict', methods=['POST', 'GET'])
def predict():
    # If users hit this route with GET directly in their browser
    if request.method == 'GET':
        return jsonify({"message": "This endpoint requires a POST request with JSON data like {'text': 'message'}"})
        
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'Missing text field'}), 400
        
    text = data['text']
    
    if model is None or vectorizer is None:
        return jsonify({'error': 'Model not loaded on server side.'}), 500
    
    print(f"\n[PREDICTION REQUEST]")
    print(f"Text: {text[:100]}...")
    
    try:
        # Get ML model prediction
        ml_result = predict_spam(text, model, vectorizer, preprocess_text)
        ml_pred = ml_result['prediction']
        ml_prob = ml_result['probability']
        
        print(f"ML Model: {ml_pred} ({ml_prob:.2%})")
        
        # Heuristic boost: if contains obvious scam keywords, boost spam probability
        has_keywords, match_count = has_scam_keywords(text)
        print(f"Heuristic: {match_count} scam keyword(s) detected")
        
        # Combine ML prediction with heuristic
        final_prob = ml_prob
        final_pred = ml_pred
        
        if has_keywords:
            # If heuristic finds scam keywords and ML agrees, boost confidence
            if ml_pred == 'spam':
                final_prob = min(1.0, ml_prob + (match_count * 0.08))
                print(f"BOOST: Both ML + heuristic detected spam → {final_prob:.2%}")
            else:
                # If heuristic finds keywords but ML says ham, trust heuristic
                final_pred = 'spam'
                final_prob = min(0.95, ml_prob + (match_count * 0.15))
                print(f"OVERRIDE: Heuristic overrides ML → spam ({final_prob:.2%})")
        
        final_prob = min(1.0, final_prob)  # Cap at 100%
        
        result = {
            "prediction": final_pred,
            "probability": float(final_prob),
            "ml_prediction": ml_pred,
            "ml_probability": float(ml_prob),
            "has_scam_keywords": has_keywords,
            "keyword_matches": match_count
        }
        
        print(f"FINAL RESULT: {final_pred} ({final_prob:.2%})")
        print()
        
        return jsonify(result)
    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/feedback', methods=['POST'])
def collect_feedback():
    """
    Collect user feedback for model improvement
    POST data: {"text": "message", "label": "spam" or "ham"}
    """
    try:
        data = request.json
        if not data or 'text' not in data or 'label' not in data:
            return jsonify({'error': 'Missing text or label field'}), 400
        
        text = data['text']
        label = data['label'].lower()
        
        if label not in ['spam', 'ham']:
            return jsonify({'error': 'Label must be "spam" or "ham"'}), 400
        
        # Get optional model prediction from request
        model_pred = data.get('model_prediction')
        model_prob = data.get('model_probability')
        
        # Record feedback
        feedback_entry = feedback_manager.add_feedback(
            text=text,
            user_label=label,
            model_prediction=model_pred,
            model_probability=model_prob
        )
        
        total_feedback = feedback_manager.get_feedback_count()
        
        return jsonify({
            'status': 'feedback_recorded',
            'total_feedback': total_feedback,
            'entry': feedback_entry
        }), 201
    
    except Exception as e:
        print(f"Error collecting feedback: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """
    Manually trigger model retraining with feedback
    Optional params:
      - mode: 'feedback_only' or 'combined' (default: 'combined')
      - min_samples: minimum feedback samples needed (default: 5)
    """
    try:
        data = request.json or {}
        mode = data.get('mode', 'combined')
        min_samples = data.get('min_samples', 5)
        
        print(f"\n[RETRAINING] Triggered with mode: {mode}")
        
        if mode == 'feedback_only':
            result = self_trainer.retrain_with_feedback(min_new_samples=min_samples)
        else:  # combined (default)
            # Path to original data
            data_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                'data',
                'spam_sms.csv'
            )
            result = self_trainer.retrain_with_combined_data(data_path, min_feedback=min_samples)
        
        if result['status'] == 'success':
            # Reload model
            global model, vectorizer
            from importlib import reload
            import model.predict as predict_module
            reload(predict_module)
            model, vectorizer = predict_module.load_artifacts()
            print("[RETRAINING] Model reloaded successfully")
            result['model_reloaded'] = True
        
        return jsonify(result), 200
    
    except Exception as e:
        print(f"Error during retraining: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/feedback-stats', methods=['GET'])
def feedback_stats():
    """Get feedback statistics"""
    try:
        stats_file = os.path.join('feedback', 'stats.json')
        if os.path.exists(stats_file):
            import json
            with open(stats_file, 'r') as f:
                stats = json.load(f)
            return jsonify(stats), 200
        else:
            return jsonify({'total_feedback': 0, 'spam': 0, 'ham': 0}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/restore-backup', methods=['POST'])
def restore_backup():
    """Restore model from backup if retraining failed"""
    try:
        result = self_trainer.restore_backup()
        
        if result['status'] == 'success':
            # Reload model
            global model, vectorizer
            from importlib import reload
            import model.predict as predict_module
            reload(predict_module)
            model, vectorizer = predict_module.load_artifacts()
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("CYBER SENTINEL ML API STARTING")
    print("Enabled features:")
    print("  - Real-time spam detection")
    print("  - User feedback collection")
    print("  - Self-training with feedback")
    print("="*50 + "\n")
    app.run(port=5000, debug=True)
