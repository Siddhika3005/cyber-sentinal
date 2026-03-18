import os
import sys
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib

# Fix imports to allow loading relative utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.preprocess import preprocess_text

def train_model(data_path):
    print(f"Loading data from {data_path}...")
    
    # We can just leverage preprocess_dataset from utils since it does exactly what we want
    from utils.preprocess import preprocess_dataset
    df = preprocess_dataset(data_path)
    
    # Ensure labels are binary (0/1) based on 'spam' or 'ham'
    df['target'] = df['label'].map({'spam': 1, 'ham': 0}).fillna(0)
        
    X = df['text']
    y = df['target']
    
    print("Vectorizing...")
    vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
    X_vec = vectorizer.fit_transform(X)
    
    print("Training Naive Bayes Model...")
    model = MultinomialNB()
    model.fit(X_vec, y)
    
    # Save artifacts
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'model.pkl')
    vec_path = os.path.join(base_dir, 'vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vec_path)
    print("Saved model and vectorizer.")

if __name__ == "__main__":
    # Adjust this to point to the correct CSV downloaded to your machine
    data_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'spam_sms.csv')
    
    # Run the full end-to-end model training
    train_model(data_file)
