import re
import pandas as pd

def preprocess_text(text):
    # Lowercase text
    text = str(text).lower()
    
    # Remove special characters
    text = re.sub(r'[^a-z0-9\s]', '', text)
    
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def preprocess_dataset(input_path, output_path=None):
    """
    Load the specific spam dataset, apply text preprocessing, and optionally save to CSV.
    """
    # The dataset might have encoding issues, so we use latin-1
    df = pd.read_csv(input_path, encoding='latin-1')
    
    # Keep only the relevant columns and rename them
    if 'v1' in df.columns and 'v2' in df.columns:
        df = df[['v1', 'v2']]
        df.columns = ['label', 'text']
    else:
        raise ValueError("The dataset does not contain 'v1' and 'v2' columns.")
            
    # Apply preprocessing
    df['text'] = df['text'].apply(preprocess_text)
    
    # Save if output path provided
    if output_path:
        df.to_csv(output_path, index=False)
        
    return df