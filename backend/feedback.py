"""
Feedback Management System for Self-Training
Collects user feedback to incrementally improve the model
"""

import json
import os
import pandas as pd
from datetime import datetime

class FeedbackManager:
    def __init__(self, feedback_dir='feedback'):
        """Initialize feedback storage"""
        self.feedback_dir = feedback_dir
        self.feedback_file = os.path.join(feedback_dir, 'feedback.jsonl')
        self.stats_file = os.path.join(feedback_dir, 'stats.json')
        
        # Create directory if not exists
        os.makedirs(feedback_dir, exist_ok=True)
        
        # Initialize stats
        if not os.path.exists(self.stats_file):
            self._save_stats({'total_feedback': 0, 'spam': 0, 'ham': 0})
    
    def add_feedback(self, text, user_label, model_prediction=None, model_probability=None):
        """
        Add user feedback for a prediction
        
        Args:
            text: The message text
            user_label: 'spam' or 'ham' (user's correct label)
            model_prediction: What the model predicted
            model_probability: Model's confidence
        
        Returns:
            dict: Feedback entry
        """
        feedback_entry = {
            'timestamp': datetime.now().isoformat(),
            'text': text,
            'label': user_label.lower(),
            'model_prediction': model_prediction,
            'model_probability': model_probability,
            'correct': user_label.lower() == model_prediction if model_prediction else None
        }
        
        # Append to feedback file
        with open(self.feedback_file, 'a') as f:
            f.write(json.dumps(feedback_entry) + '\n')
        
        # Update stats
        self._update_stats(user_label.lower())
        
        print(f"[FEEDBACK] Recorded: {user_label} ({len(text)} chars)")
        
        return feedback_entry
    
    def get_feedback_count(self):
        """Get total feedback count"""
        stats = self._load_stats()
        return stats.get('total_feedback', 0)
    
    def get_feedback_df(self, min_samples=1):
        """
        Load feedback as DataFrame for training
        
        Returns:
            pandas.DataFrame: Feedback data
        """
        if not os.path.exists(self.feedback_file) or os.path.getsize(self.feedback_file) == 0:
            print("[FEEDBACK] No feedback data available")
            return None
        
        try:
            data = []
            with open(self.feedback_file, 'r') as f:
                for line in f:
                    if line.strip():
                        data.append(json.loads(line))
            
            if not data:
                return None
            
            df = pd.DataFrame(data)
            print(f"[FEEDBACK] Loaded {len(df)} feedback entries")
            print(f"[FEEDBACK] Spam: {(df['label']=='spam').sum()}, Ham: {(df['label']=='ham').sum()}")
            
            return df
        except Exception as e:
            print(f"[FEEDBACK] Error loading feedback: {e}")
            return None
    
    def get_misclassified(self):
        """Get feedback where model was wrong"""
        df = self.get_feedback_df()
        if df is None:
            return None
        
        df_wrong = df[df['correct'] == False]
        print(f"[FEEDBACK] Found {len(df_wrong)} misclassified entries")
        return df_wrong
    
    def clear_feedback(self):
        """Clear all feedback data"""
        if os.path.exists(self.feedback_file):
            os.remove(self.feedback_file)
        self._save_stats({'total_feedback': 0, 'spam': 0, 'ham': 0})
        print("[FEEDBACK] Cleared all feedback")
    
    def _update_stats(self, label):
        """Update feedback statistics"""
        stats = self._load_stats()
        stats['total_feedback'] = stats.get('total_feedback', 0) + 1
        stats[label] = stats.get(label, 0) + 1
        stats['last_updated'] = datetime.now().isoformat()
        self._save_stats(stats)
    
    def _load_stats(self):
        """Load stats from file"""
        try:
            with open(self.stats_file, 'r') as f:
                return json.load(f)
        except:
            return {'total_feedback': 0, 'spam': 0, 'ham': 0}
    
    def _save_stats(self, stats):
        """Save stats to file"""
        with open(self.stats_file, 'w') as f:
            json.dump(stats, f, indent=2)
