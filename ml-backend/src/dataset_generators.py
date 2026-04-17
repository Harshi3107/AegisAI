"""
Dataset Generators and Processors
- Handles PaySim, T-Drive dataset processing
- Generates synthetic behavioral fraud dataset
"""
import pandas as pd
import numpy as np
from typing import Tuple, Dict
from datetime import datetime, timedelta
import os
from pathlib import Path


class PaySimProcessorDataset:
    """Process PaySim dataset for financial fraud detection"""
    
    @staticmethod
    def load_paysim(filepath: str) -> pd.DataFrame:
        """Load PaySim dataset"""
        try:
            df = pd.read_csv(filepath)
            return df
        except FileNotFoundError:
            print(f"PaySim dataset not found at {filepath}")
            return None
    
    @staticmethod
    def preprocess_paysim(df: pd.DataFrame) -> pd.DataFrame:
        """
        Preprocess PaySim dataset for fraud detection
        
        Features for financial fraud:
        - amount
        - oldbalanceOrg
        - newbalanceOrig
        - oldbalanceDest
        - newbalanceDest
        - isFraud
        """
        if df is None:
            return None
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Select relevant features
        features = ['amount', 'oldbalanceOrg', 'newbalanceOrig', 
                   'oldbalanceDest', 'newbalanceDest', 'isFraud']
        
        df = df[[col for col in features if col in df.columns]]
        
        # Handle missing values
        df = df.fillna(0)
        
        # Create derived features
        df['balance_change_org'] = df['newbalanceOrig'] - df['oldbalanceOrg']
        df['balance_change_dest'] = df['newbalanceDest'] - df['oldbalanceDest']
        df['amount_ratio'] = df['amount'] / (df['oldbalanceOrg'] + 1)
        
        return df
    
    @staticmethod
    def create_train_test_split(df: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split dataset into train and test sets
        """
        if df is None:
            return None, None
        
        test_count = int(len(df) * test_size)
        train_df = df[:-test_count]
        test_df = df[-test_count:]
        
        return train_df, test_df


class TDriveDatasetProcessor:
    """Process T-Drive dataset for movement anomaly detection"""
    
    @staticmethod
    def load_tdrive(filepath: str) -> pd.DataFrame:
        """Load T-Drive dataset"""
        try:
            df = pd.read_csv(filepath)
            return df
        except FileNotFoundError:
            print(f"T-Drive dataset not found at {filepath}")
            return None
    
    @staticmethod
    def preprocess_tdrive(df: pd.DataFrame) -> pd.DataFrame:
        """
        Preprocess T-Drive dataset for movement anomaly detection
        
        Features:
        - latitude
        - longitude
        - timestamp
        - speed
        - distance
        """
        if df is None:
            return None
        
        # Ensure required columns
        if 'timestamp' not in df.columns:
            df['timestamp'] = pd.date_range(start='2020-01-01', periods=len(df), freq='1min')
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Calculate speed if not present
        if 'speed' not in df.columns:
            df['speed'] = np.random.uniform(0, 60, len(df))
        
        # Calculate distance traveled (Haversine distance)
        if 'distance' not in df.columns:
            df['distance'] = df['speed'] * 0.0167  # Approximate distance per minute
        
        # Create movement features
        df['speed_diff'] = df['speed'].diff().fillna(0)
        df['distance_per_speed'] = df['distance'] / (df['speed'] + 0.001)
        
        return df
    
    @staticmethod
    def create_movement_features(df: pd.DataFrame, window_size: int = 5) -> pd.DataFrame:
        """
        Create features for anomaly detection from movement data
        """
        if df is None:
            return None
        
        # Rolling statistics
        df['speed_rolling_mean'] = df['speed'].rolling(window_size).mean()
        df['speed_rolling_std'] = df['speed'].rolling(window_size).std()
        df['distance_rolling_sum'] = df['distance'].rolling(window_size).sum()
        
        # Fill NaN values
        df = df.fillna(0)
        
        return df


class BehavioralDatasetGenerator:
    """Generate synthetic behavioral fraud dataset for claim validation"""
    
    @staticmethod
    def generate_dataset(
        n_samples: int = 10000,
        fraud_ratio: float = 0.15,
        seed: int = 42
    ) -> pd.DataFrame:
        """
        Generate synthetic behavioral fraud dataset
        
        Features:
        - claims_per_week: Number of claims in a week (0-7)
        - gps_jump: Sudden location jump (0-1)
        - city_match: Does GPS match registered city (0-1)
        - network_status: Network stability (0-1)
        - trigger_type: Environmental trigger (0=none, 1=rain, 2=heat, 3=aqi, 4=flood)
        - claim_amount: Claim amount (100-10000)
        - day_of_week: Day when claim was made (0-6)
        - time_of_day: Hour of claim (0-23)
        - claim_frequency: Claims in last 30 days (0-30)
        - response_time: Time to submit claim after event (minutes)
        - is_fraud: Fraud label (0 or 1)
        """
        np.random.seed(seed)
        
        n_fraud = int(n_samples * fraud_ratio)
        n_legit = n_samples - n_fraud
        
        # Legitimate claims
        legit_data = {
            'claims_per_week': np.random.poisson(1, n_legit),
            'gps_jump': np.random.uniform(0, 0.3, n_legit),  # Small jumps
            'city_match': np.random.uniform(0.8, 1.0, n_legit),  # High match
            'network_status': np.random.uniform(0.7, 1.0, n_legit),  # Stable
            'trigger_type': np.random.choice([1, 2, 3, 4], n_legit),  # Has trigger
            'claim_amount': np.random.uniform(500, 5000, n_legit),
            'day_of_week': np.random.randint(0, 7, n_legit),
            'time_of_day': np.random.randint(6, 23, n_legit),  # Working hours
            'claim_frequency': np.random.poisson(2, n_legit),  # Low frequency
            'response_time': np.random.uniform(10, 180, n_legit),  # Normal response
            'is_fraud': np.zeros(n_legit, dtype=int)
        }
        
        # Fraudulent claims
        fraud_data = {
            'claims_per_week': np.random.poisson(4, n_fraud),  # High claims
            'gps_jump': np.random.uniform(0.5, 1.0, n_fraud),  # Large jumps
            'city_match': np.random.uniform(0.0, 0.5, n_fraud),  # Low match
            'network_status': np.random.uniform(0.0, 0.5, n_fraud),  # Unstable
            'trigger_type': np.random.choice([0, 1, 2, 3, 4], n_fraud),  # May not have trigger
            'claim_amount': np.random.uniform(8000, 15000, n_fraud),  # High amounts
            'day_of_week': np.random.randint(0, 7, n_fraud),
            'time_of_day': np.random.randint(0, 6, n_fraud),  # Off-peak
            'claim_frequency': np.random.poisson(6, n_fraud),  # High frequency
            'response_time': np.random.uniform(0.5, 10, n_fraud),  # Immediate submission
            'is_fraud': np.ones(n_fraud, dtype=int)
        }
        
        # Combine datasets
        df_legit = pd.DataFrame(legit_data)
        df_fraud = pd.DataFrame(fraud_data)
        
        df = pd.concat([df_legit, df_fraud], ignore_index=True)
        df = df.sample(frac=1).reset_index(drop=True)
        
        return df
    
    @staticmethod
    def add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
        """Add temporal features to behavioral dataset"""
        
        # Convert day_of_week to cyclical features
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        # Convert time_of_day to cyclical features
        df['hour_sin'] = np.sin(2 * np.pi * df['time_of_day'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['time_of_day'] / 24)
        
        # Is weekend
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Is night shift (0-6 hours)
        df['is_night'] = ((df['time_of_day'] < 6) | (df['time_of_day'] > 22)).astype(int)
        
        return df
    
    @staticmethod
    def normalize_features(df: pd.DataFrame) -> pd.DataFrame:
        """Normalize features for ML training"""
        from sklearn.preprocessing import StandardScaler
        
        # Features to normalize
        numeric_columns = [
            'gps_jump', 'city_match', 'network_status', 'claim_amount',
            'claim_frequency', 'response_time'
        ]
        
        scaler = StandardScaler()
        df[numeric_columns] = scaler.fit_transform(df[numeric_columns])
        
        return df, scaler


class DatasetOrchestrator:
    """Orchestrate dataset processing and generation"""
    
    def __init__(self, dataset_path: str = "./datasets"):
        self.dataset_path = Path(dataset_path)
        self.dataset_path.mkdir(exist_ok=True)
    
    def prepare_financial_fraud_dataset(self, paysim_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Prepare PaySim dataset for training"""
        processor = PaySimProcessorDataset()
        df = processor.load_paysim(paysim_path)
        
        if df is None:
            print("Creating synthetic financial fraud dataset instead...")
            # Create a synthetic version if file not found
            df = self._create_synthetic_paysim(10000)
        
        df = processor.preprocess_paysim(df)
        train_df, test_df = processor.create_train_test_split(df)
        
        return train_df, test_df
    
    def prepare_movement_dataset(self, tdrive_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Prepare T-Drive dataset for training"""
        processor = TDriveDatasetProcessor()
        df = processor.load_tdrive(tdrive_path)
        
        if df is None:
            print("Creating synthetic movement dataset instead...")
            df = self._create_synthetic_tdrive(5000)
        
        df = processor.preprocess_tdrive(df)
        df = processor.create_movement_features(df)
        
        # Create train/test split
        test_count = int(len(df) * 0.2)
        train_df = df[:-test_count]
        test_df = df[-test_count:]
        
        return train_df, test_df
    
    def prepare_behavioral_dataset(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Generate behavioral fraud dataset"""
        generator = BehavioralDatasetGenerator()
        df = generator.generate_dataset(n_samples=10000)
        df = generator.add_temporal_features(df)
        df, scaler = generator.normalize_features(df)
        
        # Create train/test split
        test_count = int(len(df) * 0.2)
        train_df = df[:-test_count]
        test_df = df[-test_count:]
        
        return train_df, test_df, scaler
    
    @staticmethod
    def _create_synthetic_paysim(n_samples: int) -> pd.DataFrame:
        """Create synthetic PaySim dataset"""
        np.random.seed(42)
        return pd.DataFrame({
            'amount': np.random.uniform(100, 10000, n_samples),
            'oldbalanceOrg': np.random.uniform(0, 50000, n_samples),
            'newbalanceOrig': np.random.uniform(0, 50000, n_samples),
            'oldbalanceDest': np.random.uniform(0, 50000, n_samples),
            'newbalanceDest': np.random.uniform(0, 50000, n_samples),
            'isFraud': np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
        })
    
    @staticmethod
    def _create_synthetic_tdrive(n_samples: int) -> pd.DataFrame:
        """Create synthetic T-Drive dataset"""
        np.random.seed(42)
        timestamps = pd.date_range(start='2020-01-01', periods=n_samples, freq='1min')
        
        return pd.DataFrame({
            'timestamp': timestamps,
            'latitude': np.random.uniform(39.8, 40.0, n_samples),
            'longitude': np.random.uniform(116.2, 116.4, n_samples),
            'speed': np.random.uniform(0, 60, n_samples),
            'distance': np.random.uniform(0, 2, n_samples)
        })


if __name__ == "__main__":
    # Example usage
    orchestrator = DatasetOrchestrator()
    
    # Generate behavioral dataset
    print("Generating behavioral fraud dataset...")
    train_df, test_df, scaler = orchestrator.prepare_behavioral_dataset()
    print(f"Training set shape: {train_df.shape}")
    print(f"Test set shape: {test_df.shape}")
    print(f"Fraud ratio in training set: {train_df['is_fraud'].mean():.2%}")
