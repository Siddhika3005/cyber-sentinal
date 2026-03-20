"""
Self-Training System
Incrementally improves the model using user feedback
"""

import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.preprocess import preprocess_text
from feedback import FeedbackManager

class SelfTrainer:
    def __init__(self, model_dir='model', feedback_manager=None):
        """Initialize self-trainer"""
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, 'model.pkl')
        self.vec_path = os.path.join(model_dir, 'vectorizer.pkl')
        self.backup_model_path = os.path.join(model_dir, 'model_backup.pkl')
        self.backup_vec_path = os.path.join(model_dir, 'vectorizer_backup.pkl')
        
        self.feedback_manager = feedback_manager or FeedbackManager()
    
    def retrain_with_feedback(self, min_new_samples=5):
        """
        Retrain model using original data + user feedback
        
        Args:
            min_new_samples: Minimum feedback samples needed to trigger retraining
        
        Returns:
            dict: Training results
        """
        print("\n" + "="*60)
        print("SELF-TRAINING: Retraining model with feedback")
        print("="*60)
        
        # Check if enough feedback
        feedback_count = self.feedback_manager.get_feedback_count()
        print(f"Current feedback samples: {feedback_count}")
        
        if feedback_count < min_new_samples:
            print(f"Not enough feedback samples (need {min_new_samples}, have {feedback_count})")
            return {'status': 'skipped', 'reason': 'insufficient_feedback', 'feedback_count': feedback_count}
        
        try:
            # Get feedback data
            feedback_df = self.feedback_manager.get_feedback_df()
            
            if feedback_df is None or len(feedback_df) == 0:
                return {'status': 'skipped', 'reason': 'no_feedback_data'}
            
            # Prepare training data
            X = feedback_df['text'].apply(preprocess_text)
            y = feedback_df['label'].map({'spam': 1, 'ham': 0})
            
            print(f"\nTraining on {len(X)} samples")
            print(f"  Spam: {(y == 1).sum()}, Ham: {(y == 0).sum()}")
            
            # Load current model for fine-tuning
            try:
                vectorizer = joblib.load(self.vec_path)
                model = joblib.load(self.model_path)
                print("Loaded existing model for fine-tuning")
            except:
                print("No existing model found, training from scratch")
                vectorizer = TfidfVectorizer(
                    max_features=3000,
                    min_df=1,
                    max_df=0.9,
                    ngram_range=(1, 2),
                    stop_words='english',
                    sublinear_tf=True
                )
                model = LogisticRegression(
                    max_iter=1000,
                    random_state=42,
                    class_weight='balanced'
                )
            
            # Vectorize feedback text
            X_vec = vectorizer.fit_transform(X)
            
            # Retrain with feedback
            model.fit(X_vec, y)
            
            # Backup old model
            if os.path.exists(self.model_path):
                import shutil
                shutil.copy(self.model_path, self.backup_model_path)
                shutil.copy(self.vec_path, self.backup_vec_path)
                print("Backed up previous model")
            
            # Save new model
            joblib.dump(model, self.model_path)
            joblib.dump(vectorizer, self.vec_path)
            print(f"Saved retrained model to {self.model_path}")
            
            return {
                'status': 'success',
                'samples_trained': len(X),
                'spam_samples': int((y == 1).sum()),
                'ham_samples': int((y == 0).sum()),
                'model_updated': True
            }
        
        except Exception as e:
            print(f"ERROR during retraining: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def retrain_with_combined_data(self, original_data_path, min_feedback=5):
        """
        Retrain using both original training data + feedback
        Better for maintaining original knowledge while learning from feedback
        
        Args:
            original_data_path: Path to original training CSV
            min_feedback: Minimum feedback samples to include
        
        Returns:
            dict: Training results
        """
        print("\n" + "="*60)
        print("SELF-TRAINING: Retraining with combined data (original + feedback)")
        print("="*60)
        
        try:
            # Load original data
            try:
                original_df = pd.read_csv(original_data_path, encoding='latin-1')
                if 'v1' in original_df.columns and 'v2' in original_df.columns:
                    original_df = original_df[['v1', 'v2']]
                    original_df.columns = ['label', 'text']
                print(f"Loaded original data: {len(original_df)} samples")
            except Exception as e:
                print(f"Warning: Could not load original data ({e}), using feedback only")
                original_df = None
            
            # Load feedback data
            feedback_df = self.feedback_manager.get_feedback_df()
            
            if feedback_df is None:
                feedback_df = pd.DataFrame()
            
            # Combine datasets
            feedback_df_clean = feedback_df[['text', 'label']].copy()
            
            if original_df is not None and len(original_df) > 0:
                # Combine, removing duplicates (prefer feedback labels)
                combined_df = pd.concat([original_df, feedback_df_clean], ignore_index=True)
                # Remove duplicates, keeping latest (feedback)
                combined_df = combined_df.drop_duplicates(subset=['text'], keep='last')
                print(f"Combined dataset: {len(combined_df)} samples (original + feedback)")
            elif len(feedback_df_clean) > 0:
                combined_df = feedback_df_clean
                print(f"Using feedback only: {len(combined_df)} samples")
            else:
                return {'status': 'skipped', 'reason': 'no_data'}
            
            if len(combined_df) < min_feedback:
                return {'status': 'skipped', 'reason': f'insufficient_samples (need {min_feedback})', 'samples': len(combined_df)}
            
            # Prepare data
            X = combined_df['text'].apply(preprocess_text)
            y = combined_df['label'].map({'spam': 1, 'ham': 0})
            
            print(f"Training on {len(combined_df)} combined samples")
            print(f"  Spam: {(y == 1).sum()}, Ham: {(y == 0).sum()}")
            
            # Vectorize
            vectorizer = TfidfVectorizer(
                max_features=3000,
                min_df=2,
                max_df=0.8,
                ngram_range=(1, 2),
                stop_words='english',
                sublinear_tf=True
            )
            X_vec = vectorizer.fit_transform(X)
            
            # Train model
            model = LogisticRegression(
                max_iter=1000,
                random_state=42,
                class_weight='balanced',
                C=0.8
            )
            model.fit(X_vec, y)
            
            # Backup old model
            if os.path.exists(self.model_path):
                import shutil
                shutil.copy(self.model_path, self.backup_model_path)
                shutil.copy(self.vec_path, self.backup_vec_path)
                print("Backed up previous model")
            
            # Save new model
            joblib.dump(model, self.model_path)
            joblib.dump(vectorizer, self.vec_path)
            print(f"Saved retrained model to {self.model_path}")
            
            return {
                'status': 'success',
                'total_samples': len(combined_df),
                'original_samples': len(original_df) if original_df is not None else 0,
                'feedback_samples': len(feedback_df),
                'spam_samples': int((y == 1).sum()),
                'ham_samples': int((y == 0).sum()),
                'model_updated': True
            }
        
        except Exception as e:
            print(f"ERROR during combined retraining: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def restore_backup(self):
        """Restore previous model from backup"""
        try:
            if os.path.exists(self.backup_model_path) and os.path.exists(self.backup_vec_path):
                import shutil
                shutil.copy(self.backup_model_path, self.model_path)
                shutil.copy(self.backup_vec_path, self.vec_path)
                print("Restored model from backup")
                return {'status': 'success', 'message': 'Restored from backup'}
            else:
                return {'status': 'error', 'message': 'No backup found'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

from utils.preprocess import preprocess_text
