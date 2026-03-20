import re
import pandas as pd

def preprocess_text(text):
    """
    Enhanced text preprocessing for phishing/scam detection
    """
    # Convert to lowercase
    text = str(text).lower()
    
    # Remove URLs but keep domain info
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', ' urllink ', text)
    
    # Remove email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', ' email ', text)
    
    # Expand common abbreviations
    text = re.sub(r'\bwont\b', 'will not', text)
    text = re.sub(r'\bcan\'t\b', 'cannot', text)
    text = re.sub(r'\bdont\b', 'do not', text)
    
    # Keep important punctuation that indicates urgency/emphasis
    # Replace multiple punctuation with single
    text = re.sub(r'!+', ' exclamation ', text)
    text = re.sub(r'\?+', ' question ', text)
    
    # Remove numbers (less important for phishing detection)
    text = re.sub(r'\d+', ' number ', text)
    
    # Remove special characters
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def preprocess_dataset(input_path, output_path=None):
    """
    Load dataset and apply preprocessing
    """
    # Try multiple encodings
    encodings = ['utf-8', 'latin-1', 'iso-8859-1']
    df = None
    
    for encoding in encodings:
        try:
            df = pd.read_csv(input_path, encoding=encoding)
            break
        except Exception as e:
            continue
    
    if df is None:
        raise ValueError(f"Could not read {input_path} with any supported encoding")
    
    # Handle different column names
    if 'v1' in df.columns and 'v2' in df.columns:
        df = df[['v1', 'v2']]
        df.columns = ['label', 'text']
    elif 'label' not in df.columns or 'text' not in df.columns:
        raise ValueError("Dataset must have 'label' and 'text' columns")
    
    # Clean labels
    df['label'] = df['label'].str.lower().str.strip()
    
    # Filter out invalid labels
    df = df[df['label'].isin(['spam', 'ham'])]
    
    # Apply preprocessing
    df['text'] = df['text'].apply(preprocess_text)
    
    # Save if output path provided
    if output_path:
        df.to_csv(output_path, index=False)
    
    return df