import os
import sys
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
import joblib

# Fix imports to allow loading relative utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.preprocess import preprocess_text, preprocess_dataset

def train_model(data_path):
    print(f"Loading data from {data_path}...")
    
    try:
        df = preprocess_dataset(data_path)
    except FileNotFoundError:
        print(f"ERROR: Data file not found at {data_path}")
        print("Creating dummy model for testing...")
        create_dummy_model()
        return
    
    # Ensure labels are binary (0/1) based on 'spam' or 'ham'
    df['target'] = df['label'].map({'spam': 1, 'ham': 0}).fillna(0)
    
    print(f"Dataset loaded: {len(df)} samples")
    print(f"Spam: {(df['target'] == 1).sum()}, Ham: {(df['target'] == 0).sum()}")
    
    X = df['text']
    y = df['target']
    
    print("\nVectorizing text...")
    # Use TF-IDF with better parameters
    vectorizer = TfidfVectorizer(
        max_features=3000,
        min_df=2,
        max_df=0.8,
        ngram_range=(1, 2),  # Use unigrams and bigrams
        stop_words='english',
        lowercase=True,
        sublinear_tf=True  # Apply sublinear tf scaling
    )
    X_vec = vectorizer.fit_transform(X)
    
    print("Training Logistic Regression Model...")
    # Use Logistic Regression instead of Naive Bayes (better performance)
    model = LogisticRegression(
        max_iter=1000,
        solver='lbfgs',
        random_state=42,
        class_weight='balanced'  # Handle imbalanced data
    )
    model.fit(X_vec, y)
    
    # Save artifacts
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'model.pkl')
    vec_path = os.path.join(base_dir, 'vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vec_path)
    
    print(f"\nModel trained successfully!")
    print(f"Saved to: {model_path}")
    print(f"Vectorizer saved to: {vec_path}")
    
    # Test the model
    print("\nTesting model on sample spam messages...")
    test_messages = [
        "Click here immediately to verify your account",
        "Congratulations you won $1000 claim your prize now",
        "Your bank account has been locked verify password",
        "Hello how are you today",
        "Just checking in with you"
    ]
    
    for msg in test_messages:
        processed = preprocess_text(msg)
        features = vectorizer.transform([processed])
        pred = model.predict(features)[0]
        prob = model.predict_proba(features)[0].max()
        label = "SPAM" if pred == 1 else "HAM"
        print(f"  {msg[:50]}... → {label} ({prob:.2%})")

def create_dummy_model():
    """Create a dummy model with aggressive spam detection for testing"""
    print("Creating dummy model with aggressive scam detection...")
    
    # Create a simple training set
    spam_texts = [
        "click here immediately verify account",
        "congratulations won prize claim now",
        "urgent action required locked account",
        "confirm password banking details",
        "unusual activity detected verify identity",
        "unusual suspicious transaction",
        "update payment method billing",
        "verify email account immediately"
    ]
    
    ham_texts = [
        "hello how are you today",
        "just checking in with you",
        "see you later this week",
        "thanks for your message",
        "looking forward to meeting",
        "have a great day",
        "talk to you soon",
        "appreciate your help"
    ]
    
    X = spam_texts + ham_texts
    y = [1] * len(spam_texts) + [0] * len(ham_texts)
    
    print(f"Training on {len(X)} dummy samples ({len(spam_texts)} spam, {len(ham_texts)} ham)")
    
    # Vectorize
    vectorizer = TfidfVectorizer(
        max_features=1000,
        ngram_range=(1, 2),
        stop_words='english',
        sublinear_tf=True
    )
    X_vec = vectorizer.fit_transform(X)
    
    # Train model with aggressive spam detection
    model = LogisticRegression(
        max_iter=500,
        C=0.5,  # Lower C = more regularization = more aggressive
        random_state=42,
        class_weight='balanced'
    )
    model.fit(X_vec, y)
    
    # Save
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'model.pkl')
    vec_path = os.path.join(base_dir, 'vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vec_path)
    
    print(f"Dummy model saved to: {model_path}")
    print(f"Vectorizer saved to: {vec_path}")
    
    # Test it
    print("\nTesting dummy model...")
    test_messages = [
        "Click here immediately to verify your account",
        "Hello how are you today"
    ]
    
    for msg in test_messages:
        from utils.preprocess import preprocess_text
        processed = preprocess_text(msg)
        features = vectorizer.transform([processed])
        pred = model.predict(features)[0]
        prob = model.predict_proba(features)[0].max()
        label = "SPAM" if pred == 1 else "HAM"
        print(f"  {msg[:50]}... → {label} ({prob:.2%})")

if __name__ == "__main__":
    # Try to load real dataset
    data_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'spam_sms.csv')
    
    if os.path.exists(data_file):
        train_model(data_file)
    else:
        print(f"Dataset not found at {data_file}")
        print("Creating dummy model instead...\n")
        create_dummy_model()
