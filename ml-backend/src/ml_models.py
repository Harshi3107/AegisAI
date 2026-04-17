"""
ML Model Training and Management
Trains and manages three fraud detection models:
1. Financial Fraud (Random Forest)
2. Movement Anomaly (Isolation Forest)
3. Behavioral Fraud (Random Forest)
"""
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Tuple, Dict, Optional
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
from sklearn.preprocessing import StandardScaler
import joblib


class MLModelManager:
    """Manages training, saving, and loading of ML models"""
    
    def __init__(self, model_path: str = "./models"):
        self.model_path = Path(model_path)
        self.model_path.mkdir(exist_ok=True)
        
        self.financial_fraud_model = None
        self.movement_anomaly_model = None
        self.behavioral_fraud_model = None
        
        self.financial_fraud_scaler = None
        self.movement_anomaly_scaler = None
        self.behavioral_fraud_scaler = None
    
    # ========== FINANCIAL FRAUD MODEL ==========
    def train_financial_fraud_model(
        self,
        train_df: pd.DataFrame,
        test_df: Optional[pd.DataFrame] = None,
        random_state: int = 42
    ) -> Dict[str, float]:
        """
        Train RandomForest for financial transaction fraud detection
        
        Features:
        - amount
        - oldbalanceOrg
        - newbalanceOrig
        - balance_change_org
        - balance_change_dest
        - amount_ratio
        """
        
        # Feature selection
        feature_cols = [
            'amount', 'oldbalanceOrg', 'newbalanceOrig',
            'balance_change_org', 'balance_change_dest', 'amount_ratio'
        ]
        
        feature_cols = [col for col in feature_cols if col in train_df.columns]
        
        if 'isFraud' not in train_df.columns:
            raise ValueError("Training data must have 'isFraud' column")
        
        X_train = train_df[feature_cols]
        y_train = train_df['isFraud']
        
        # Scale features
        self.financial_fraud_scaler = StandardScaler()
        X_train_scaled = self.financial_fraud_scaler.fit_transform(X_train)
        
        # Train model
        self.financial_fraud_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=random_state,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        self.financial_fraud_model.fit(X_train_scaled, y_train)
        
        metrics = {}
        
        # Evaluate on training set
        y_pred_train = self.financial_fraud_model.predict(X_train_scaled)
        y_pred_proba_train = self.financial_fraud_model.predict_proba(X_train_scaled)[:, 1]
        
        metrics['train_precision'] = precision_score(y_train, y_pred_train)
        metrics['train_recall'] = recall_score(y_train, y_pred_train)
        metrics['train_f1'] = f1_score(y_train, y_pred_train)
        metrics['train_auc'] = roc_auc_score(y_train, y_pred_proba_train)
        
        # Evaluate on test set if provided
        if test_df is not None:
            X_test = test_df[feature_cols]
            y_test = test_df['isFraud']
            
            X_test_scaled = self.financial_fraud_scaler.transform(X_test)
            y_pred_test = self.financial_fraud_model.predict(X_test_scaled)
            y_pred_proba_test = self.financial_fraud_model.predict_proba(X_test_scaled)[:, 1]
            
            metrics['test_precision'] = precision_score(y_test, y_pred_test)
            metrics['test_recall'] = recall_score(y_test, y_pred_test)
            metrics['test_f1'] = f1_score(y_test, y_pred_test)
            metrics['test_auc'] = roc_auc_score(y_test, y_pred_proba_test)
        
        return metrics
    
    def predict_financial_fraud(self, transaction_data: Dict) -> Tuple[float, float]:
        """
        Predict financial fraud probability
        
        Args:
            transaction_data: Dict with transaction details
            
        Returns:
            Tuple of (fraud_probability, confidence)
        """
        if self.financial_fraud_model is None:
            raise ValueError("Model not trained. Call train_financial_fraud_model first")
        
        feature_cols = [
            'amount', 'oldbalanceOrg', 'newbalanceOrig',
            'balance_change_org', 'balance_change_dest', 'amount_ratio'
        ]
        
        # Create feature vector
        features = np.array([[
            transaction_data.get(col, 0) for col in feature_cols
        ]])
        
        features_scaled = self.financial_fraud_scaler.transform(features)
        
        # Get prediction probabilities
        proba = self.financial_fraud_model.predict_proba(features_scaled)[0]
        fraud_prob = proba[1]  # Probability of fraud
        confidence = max(proba)  # Confidence in prediction
        
        return fraud_prob, confidence
    
    # ========== MOVEMENT ANOMALY MODEL ==========
    def train_movement_anomaly_model(
        self,
        train_df: pd.DataFrame,
        test_df: Optional[pd.DataFrame] = None,
        contamination: float = 0.1
    ) -> Dict[str, float]:
        """
        Train IsolationForest for movement anomaly detection
        
        Features:
        - speed
        - distance
        - speed_diff
        - distance_per_speed
        - speed_rolling_std
        """
        
        feature_cols = [
            'speed', 'distance', 'speed_diff',
            'distance_per_speed', 'speed_rolling_std'
        ]
        
        feature_cols = [col for col in feature_cols if col in train_df.columns]
        
        X_train = train_df[feature_cols]
        
        # Scale features
        self.movement_anomaly_scaler = StandardScaler()
        X_train_scaled = self.movement_anomaly_scaler.fit_transform(X_train)
        
        # Train Isolation Forest
        self.movement_anomaly_model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
        self.movement_anomaly_model.fit(X_train_scaled)
        
        # Get anomaly scores
        train_scores = -self.movement_anomaly_model.score_samples(X_train_scaled)
        
        metrics = {
            'train_anomaly_ratio': (train_scores > 0.5).mean(),
            'train_mean_score': train_scores.mean(),
            'train_std_score': train_scores.std()
        }
        
        if test_df is not None:
            X_test = test_df[feature_cols]
            X_test_scaled = self.movement_anomaly_scaler.transform(X_test)
            test_scores = -self.movement_anomaly_model.score_samples(X_test_scaled)
            
            metrics['test_anomaly_ratio'] = (test_scores > 0.5).mean()
            metrics['test_mean_score'] = test_scores.mean()
            metrics['test_std_score'] = test_scores.std()
        
        return metrics
    
    def predict_movement_anomaly(self, movement_data: Dict) -> Tuple[float, float]:
        """
        Predict movement anomaly probability
        
        Args:
            movement_data: Dict with movement features
            
        Returns:
            Tuple of (anomaly_probability, raw_score)
        """
        if self.movement_anomaly_model is None:
            raise ValueError("Model not trained. Call train_movement_anomaly_model first")
        
        feature_cols = [
            'speed', 'distance', 'speed_diff',
            'distance_per_speed', 'speed_rolling_std'
        ]
        
        features = np.array([[
            movement_data.get(col, 0) for col in feature_cols
        ]])
        
        features_scaled = self.movement_anomaly_scaler.transform(features)
        
        # IsolationForest returns -1 for anomalies, 1 for normal
        # Convert to probability
        raw_score = -self.movement_anomaly_model.score_samples(features_scaled)[0]
        anomaly_prob = min(1.0, max(0.0, raw_score))
        
        return anomaly_prob, raw_score
    
    # ========== BEHAVIORAL FRAUD MODEL ==========
    def train_behavioral_fraud_model(
        self,
        train_df: pd.DataFrame,
        test_df: Optional[pd.DataFrame] = None,
        random_state: int = 42
    ) -> Dict[str, float]:
        """
        Train RandomForest for behavioral fraud detection
        
        Features:
        - claims_per_week
        - gps_jump
        - city_match
        - network_status
        - trigger_type
        - claim_amount
        - claim_frequency
        - response_time
        - day_sin, day_cos
        - hour_sin, hour_cos
        - is_weekend
        - is_night
        """
        
        feature_cols = [
            'claims_per_week', 'gps_jump', 'city_match', 'network_status',
            'trigger_type', 'claim_amount', 'claim_frequency', 'response_time',
            'day_sin', 'day_cos', 'hour_sin', 'hour_cos', 'is_weekend', 'is_night'
        ]
        
        feature_cols = [col for col in feature_cols if col in train_df.columns]
        
        if 'is_fraud' not in train_df.columns:
            raise ValueError("Training data must have 'is_fraud' column")
        
        X_train = train_df[feature_cols]
        y_train = train_df['is_fraud']
        
        # Scale features
        self.behavioral_fraud_scaler = StandardScaler()
        X_train_scaled = self.behavioral_fraud_scaler.fit_transform(X_train)
        
        # Train model
        self.behavioral_fraud_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=8,
            min_samples_leaf=4,
            random_state=random_state,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        self.behavioral_fraud_model.fit(X_train_scaled, y_train)
        
        metrics = {}
        
        # Evaluate on training set
        y_pred_train = self.behavioral_fraud_model.predict(X_train_scaled)
        y_pred_proba_train = self.behavioral_fraud_model.predict_proba(X_train_scaled)[:, 1]
        
        metrics['train_precision'] = precision_score(y_train, y_pred_train)
        metrics['train_recall'] = recall_score(y_train, y_pred_train)
        metrics['train_f1'] = f1_score(y_train, y_pred_train)
        metrics['train_auc'] = roc_auc_score(y_train, y_pred_proba_train)
        
        # Feature importance
        metrics['feature_importance'] = dict(zip(
            feature_cols,
            self.behavioral_fraud_model.feature_importances_.tolist()
        ))
        
        # Evaluate on test set if provided
        if test_df is not None:
            X_test = test_df[feature_cols]
            y_test = test_df['is_fraud']
            
            X_test_scaled = self.behavioral_fraud_scaler.transform(X_test)
            y_pred_test = self.behavioral_fraud_model.predict(X_test_scaled)
            y_pred_proba_test = self.behavioral_fraud_model.predict_proba(X_test_scaled)[:, 1]
            
            metrics['test_precision'] = precision_score(y_test, y_pred_test)
            metrics['test_recall'] = recall_score(y_test, y_pred_test)
            metrics['test_f1'] = f1_score(y_test, y_pred_test)
            metrics['test_auc'] = roc_auc_score(y_test, y_pred_proba_test)
        
        return metrics
    
    def predict_behavioral_fraud(self, behavioral_data: Dict) -> Tuple[float, Dict]:
        """
        Predict behavioral fraud probability
        
        Args:
            behavioral_data: Dict with behavioral features
            
        Returns:
            Tuple of (fraud_probability, explanation_dict)
        """
        if self.behavioral_fraud_model is None:
            raise ValueError("Model not trained. Call train_behavioral_fraud_model first")
        
        feature_cols = [
            'claims_per_week', 'gps_jump', 'city_match', 'network_status',
            'trigger_type', 'claim_amount', 'claim_frequency', 'response_time',
            'day_sin', 'day_cos', 'hour_sin', 'hour_cos', 'is_weekend', 'is_night'
        ]
        
        features = np.array([[
            behavioral_data.get(col, 0) for col in feature_cols
        ]])
        
        features_scaled = self.behavioral_fraud_scaler.transform(features)
        
        # Get prediction probabilities
        proba = self.behavioral_fraud_model.predict_proba(features_scaled)[0]
        fraud_prob = proba[1]
        
        # Get feature importance from model
        feature_importance = dict(zip(
            feature_cols,
            self.behavioral_fraud_model.feature_importances_.tolist()
        ))
        
        # Sort by importance
        top_features = sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        explanation = {
            'top_risk_factors': [f[0] for f in top_features],
            'importance_scores': {f[0]: f[1] for f in top_features}
        }
        
        return fraud_prob, explanation
    
    # ========== MODEL PERSISTENCE ==========
    def save_models(self) -> bool:
        """Save all trained models and scalers to disk"""
        try:
            joblib.dump(
                self.financial_fraud_model,
                self.model_path / "financial_fraud_model.pkl"
            )
            joblib.dump(
                self.financial_fraud_scaler,
                self.model_path / "financial_fraud_scaler.pkl"
            )
            
            joblib.dump(
                self.movement_anomaly_model,
                self.model_path / "movement_anomaly_model.pkl"
            )
            joblib.dump(
                self.movement_anomaly_scaler,
                self.model_path / "movement_anomaly_scaler.pkl"
            )
            
            joblib.dump(
                self.behavioral_fraud_model,
                self.model_path / "behavioral_fraud_model.pkl"
            )
            joblib.dump(
                self.behavioral_fraud_scaler,
                self.model_path / "behavioral_fraud_scaler.pkl"
            )
            
            return True
        except Exception as e:
            print(f"Error saving models: {e}")
            return False
    
    def load_models(self) -> bool:
        """Load trained models and scalers from disk"""
        try:
            self.financial_fraud_model = joblib.load(
                self.model_path / "financial_fraud_model.pkl"
            )
            self.financial_fraud_scaler = joblib.load(
                self.model_path / "financial_fraud_scaler.pkl"
            )
            
            self.movement_anomaly_model = joblib.load(
                self.model_path / "movement_anomaly_model.pkl"
            )
            self.movement_anomaly_scaler = joblib.load(
                self.model_path / "movement_anomaly_scaler.pkl"
            )
            
            self.behavioral_fraud_model = joblib.load(
                self.model_path / "behavioral_fraud_model.pkl"
            )
            self.behavioral_fraud_scaler = joblib.load(
                self.model_path / "behavioral_fraud_scaler.pkl"
            )
            
            return True
        except Exception as e:
            print(f"Error loading models: {e}")
            return False
    
    def get_model_status(self) -> Dict[str, bool]:
        """Check which models are trained and available"""
        return {
            'financial_fraud_trained': self.financial_fraud_model is not None,
            'movement_anomaly_trained': self.movement_anomaly_model is not None,
            'behavioral_fraud_trained': self.behavioral_fraud_model is not None,
            'models_saved': all([
                (self.model_path / "financial_fraud_model.pkl").exists(),
                (self.model_path / "movement_anomaly_model.pkl").exists(),
                (self.model_path / "behavioral_fraud_model.pkl").exists()
            ])
        }


if __name__ == "__main__":
    print("ML Model Manager module loaded successfully")
