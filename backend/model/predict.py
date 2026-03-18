import os
import joblib

def load_artifacts():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'model.pkl')
    vec_path = os.path.join(base_dir, 'vectorizer.pkl')
    
    model = joblib.load(model_path)
    vectorizer = joblib.load(vec_path)
    return model, vectorizer

def predict_spam(text, model, vectorizer, preprocess_fn):
    processed = preprocess_fn(text)
    features = vectorizer.transform([processed])
    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0].max()
    
    result = "spam" if prediction == 1 else "ham"
    return {
        "prediction": result,
        "probability": float(probability)
    }
