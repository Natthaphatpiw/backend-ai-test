import os
from typing import Dict, Optional, List, Tuple
from datetime import datetime
import logging
from openai import OpenAI
import json
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Sentiment Analysis using OpenAI API and ML Models (Naive Bayes, Logistic Regression)"""

    def __init__(self, openai_api_key: str = None, auto_train: bool = True):
        self.openai_client = OpenAI(api_key=openai_api_key) if openai_api_key else None
        self.class_labels = ['Negative', 'Neutral', 'Positive']

        # ML Models
        self.vectorizer = None
        self.nb_model = None
        self.lr_model = None
        self.training_history = {
            'trained': False,
            'samples': 0,
            'nb_metrics': {},
            'lr_metrics': {},
            'cm_nb': None,
            'cm_lr': None
        }

        if self.openai_client:
            logger.info("✓ OpenAI client initialized")
        else:
            logger.warning("⚠️ OpenAI API key not provided")

        # Try to load pre-trained models if they exist
        self._load_models()

        # Auto-train models on startup if enabled and not already trained
        if auto_train and not self.training_history['trained']:
            self._auto_train_models()

    def analyze_with_openai(self, text: str) -> Optional[Dict]:
        """Analyze sentiment using OpenAI GPT-4o-mini"""
        try:
            if not self.openai_client:
                logger.warning("OpenAI client not initialized")
                return None

            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a sentiment analysis expert. Analyze the sentiment of the given text and respond with ONLY a JSON object containing 'sentiment' (Positive, Negative, or Neutral) and 'confidence' (0.0 to 1.0) and 'explanation' (brief explanation in Thai)"
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this text: {text}"
                    }
                ],
                temperature=0.3,
                max_tokens=200
            )

            try:
                result = json.loads(response.choices[0].message.content)
                return result
            except json.JSONDecodeError:
                return {
                    "sentiment": "Neutral",
                    "confidence": 0.5,
                    "explanation": "Could not parse response"
                }

        except Exception as e:
            logger.error(f"Error in OpenAI analysis: {e}")
            return None

    def _load_models(self):
        """Load pre-trained models from disk if available"""
        try:
            model_dir = os.path.join(os.getcwd(), 'ml_models')
            if os.path.exists(model_dir):
                vectorizer_path = os.path.join(model_dir, 'vectorizer.pkl')
                nb_path = os.path.join(model_dir, 'nb_model.pkl')
                lr_path = os.path.join(model_dir, 'lr_model.pkl')
                history_path = os.path.join(model_dir, 'training_history.json')

                if all(os.path.exists(p) for p in [vectorizer_path, nb_path, lr_path]):
                    with open(vectorizer_path, 'rb') as f:
                        self.vectorizer = pickle.load(f)
                    with open(nb_path, 'rb') as f:
                        self.nb_model = pickle.load(f)
                    with open(lr_path, 'rb') as f:
                        self.lr_model = pickle.load(f)

                    if os.path.exists(history_path):
                        with open(history_path, 'r') as f:
                            self.training_history = json.load(f)

                    self.training_history['trained'] = True
                    logger.info("✓ Pre-trained ML models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load pre-trained models: {e}")

    def _save_models(self):
        """Save trained models to disk"""
        try:
            model_dir = os.path.join(os.getcwd(), 'ml_models')
            os.makedirs(model_dir, exist_ok=True)

            with open(os.path.join(model_dir, 'vectorizer.pkl'), 'wb') as f:
                pickle.dump(self.vectorizer, f)
            with open(os.path.join(model_dir, 'nb_model.pkl'), 'wb') as f:
                pickle.dump(self.nb_model, f)
            with open(os.path.join(model_dir, 'lr_model.pkl'), 'wb') as f:
                pickle.dump(self.lr_model, f)
            with open(os.path.join(model_dir, 'training_history.json'), 'w') as f:
                json.dump(self.training_history, f)

            logger.info("✓ Models saved successfully")
        except Exception as e:
            logger.error(f"Error saving models: {e}")

    def train_models(self, texts: List[str], labels: List[int]) -> Dict:
        """
        Train Naive Bayes and Logistic Regression models
        labels: -1 (Negative), 0 (Neutral), 1 (Positive)
        """
        if len(texts) < 10:
            return {'error': 'Need at least 10 samples to train'}

        try:
            # Convert labels to 0, 1, 2 format
            label_map = {-1: 0, 0: 1, 1: 2}  # Negative, Neutral, Positive
            converted_labels = np.array([label_map.get(l, 1) for l in labels])

            # TF-IDF Vectorization
            self.vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2), min_df=2, max_df=0.8)
            X = self.vectorizer.fit_transform(texts)

            # Split data (80-20)
            split_idx = int(len(texts) * 0.8)
            X_train, X_test = X[:split_idx], X[split_idx:]
            y_train, y_test = converted_labels[:split_idx], converted_labels[split_idx:]

            # Train Naive Bayes
            self.nb_model = MultinomialNB(alpha=0.5)
            self.nb_model.fit(X_train, y_train)
            y_pred_nb = self.nb_model.predict(X_test)

            # Train Logistic Regression
            self.lr_model = LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
            self.lr_model.fit(X_train, y_train)
            y_pred_lr = self.lr_model.predict(X_test)

            # Calculate metrics
            self.training_history = {
                'trained': True,
                'samples': len(texts),
                'nb_metrics': {
                    'accuracy': float(accuracy_score(y_test, y_pred_nb)),
                    'precision': float(precision_score(y_test, y_pred_nb, average='weighted', zero_division=0)),
                    'recall': float(recall_score(y_test, y_pred_nb, average='weighted', zero_division=0)),
                    'f1_score': float(f1_score(y_test, y_pred_nb, average='weighted', zero_division=0))
                },
                'lr_metrics': {
                    'accuracy': float(accuracy_score(y_test, y_pred_lr)),
                    'precision': float(precision_score(y_test, y_pred_lr, average='weighted', zero_division=0)),
                    'recall': float(recall_score(y_test, y_pred_lr, average='weighted', zero_division=0)),
                    'f1_score': float(f1_score(y_test, y_pred_lr, average='weighted', zero_division=0))
                },
                'cm_nb': confusion_matrix(y_test, y_pred_nb).tolist(),
                'cm_lr': confusion_matrix(y_test, y_pred_lr).tolist()
            }

            self._save_models()

            logger.info("✓ Models trained successfully")
            return self.training_history

        except Exception as e:
            logger.error(f"Error training models: {e}")
            return {'error': str(e)}

    def analyze_with_ml(self, text: str) -> Dict:
        """Analyze sentiment using trained ML models"""
        if not self.vectorizer or not self.nb_model or not self.lr_model:
            return {}

        try:
            X = self.vectorizer.transform([text])

            nb_pred = self.nb_model.predict(X)[0]
            nb_proba = self.nb_model.predict_proba(X)[0].max()

            lr_pred = self.lr_model.predict(X)[0]
            lr_proba = self.lr_model.predict_proba(X)[0].max()

            label_reverse = {0: 'Negative', 1: 'Neutral', 2: 'Positive'}

            return {
                'naive_bayes': {
                    'sentiment': label_reverse[nb_pred],
                    'confidence': float(nb_proba)
                },
                'logistic_regression': {
                    'sentiment': label_reverse[lr_pred],
                    'confidence': float(lr_proba)
                }
            }
        except Exception as e:
            logger.error(f"Error in ML analysis: {e}")
            return {}

    def _auto_train_models(self):
        """Automatically train models with JSON training data on startup"""
        try:
            training_data_path = os.path.join(os.getcwd(), 'training_data.json')

            if not os.path.exists(training_data_path):
                logger.warning(f"Training data file not found at {training_data_path}")
                return

            with open(training_data_path, 'r', encoding='utf-8') as f:
                training_data = json.load(f)

            if not training_data or len(training_data) < 10:
                logger.warning(f"Insufficient training data: {len(training_data) if training_data else 0} samples")
                return

            texts = [item['text'] for item in training_data]
            labels = [item['label'] for item in training_data]

            logger.info(f"Auto-training ML models with {len(texts)} samples...")
            result = self.train_models(texts, labels)

            if 'error' not in result:
                logger.info("✓ ML models trained successfully during startup")
            else:
                logger.error(f"Failed to train models: {result.get('error')}")

        except Exception as e:
            logger.error(f"Error during auto-training: {e}")

    def analyze(self, text: str) -> Dict:
        """Analyze sentiment using OpenAI API and ML models"""
        result = {
            'text': text,
            'timestamp': datetime.now().isoformat(),
            'models': {},
            'training_status': self.training_history['trained']
        }

        # OpenAI GPT-4o-mini (Pre-trained model)
        gpt_result = self.analyze_with_openai(text)
        if gpt_result:
            result['models']['pre_trained'] = gpt_result
        else:
            logger.error("Failed to get response from OpenAI")
            result['models']['pre_trained'] = {
                'sentiment': 'Neutral',
                'confidence': 0.0,
                'explanation': 'Error: Could not analyze sentiment'
            }

        # ML Models (if trained)
        if self.training_history['trained']:
            ml_results = self.analyze_with_ml(text)
            result['models'].update(ml_results)

        return result
