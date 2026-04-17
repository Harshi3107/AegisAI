"""
Model Training Script
Train all three ML models and save them for inference
"""
import sys
import logging
from pathlib import Path
from src.dataset_generators import DatasetOrchestrator
from src.ml_models import MLModelManager
from src.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def train_all_models():
    """Train all three ML models"""
    
    logger.info("=" * 80)
    logger.info("AGESIS AI - ML Model Training Pipeline")
    logger.info("=" * 80)
    
    try:
        # Initialize managers
        orchestrator = DatasetOrchestrator(settings.dataset_path)
        model_manager = MLModelManager(settings.model_path)
        
        # ========== 1. FINANCIAL FRAUD MODEL ==========
        logger.info("\n" + "=" * 80)
        logger.info("1. Training Financial Fraud Model (PaySim)")
        logger.info("=" * 80)
        
        try:
            logger.info("Preparing PaySim dataset...")
            paysim_path = Path(settings.dataset_path) / "paysim" / "PS_20174392719_1491204493457_log.csv"
            
            train_df, test_df = orchestrator.prepare_financial_fraud_dataset(str(paysim_path))
            logger.info(f"Training set shape: {train_df.shape}")
            logger.info(f"Test set shape: {test_df.shape}")
            logger.info(f"Fraud ratio: {train_df['isFraud'].mean():.2%}")
            
            logger.info("Training RandomForest model...")
            metrics = model_manager.train_financial_fraud_model(train_df, test_df)
            
            logger.info("\nFinancial Fraud Model Metrics:")
            for metric, value in metrics.items():
                if isinstance(value, float):
                    logger.info(f"  {metric}: {value:.4f}")
            
            logger.info("✓ Financial fraud model trained successfully")
        
        except Exception as e:
            logger.warning(f"⚠ Financial fraud model training skipped: {e}")
        
        # ========== 2. MOVEMENT ANOMALY MODEL ==========
        logger.info("\n" + "=" * 80)
        logger.info("2. Training Movement Anomaly Model (T-Drive)")
        logger.info("=" * 80)
        
        try:
            logger.info("Preparing T-Drive dataset...")
            tdrive_path = Path(settings.dataset_path) / "tdrive" / "trajectory_data.csv"
            
            train_df, test_df = orchestrator.prepare_movement_dataset(str(tdrive_path))
            logger.info(f"Training set shape: {train_df.shape}")
            logger.info(f"Test set shape: {test_df.shape}")
            
            logger.info("Training IsolationForest model...")
            metrics = model_manager.train_movement_anomaly_model(train_df, test_df)
            
            logger.info("\nMovement Anomaly Model Metrics:")
            for metric, value in metrics.items():
                if isinstance(value, float):
                    logger.info(f"  {metric}: {value:.4f}")
            
            logger.info("✓ Movement anomaly model trained successfully")
        
        except Exception as e:
            logger.warning(f"⚠ Movement anomaly model training skipped: {e}")
        
        # ========== 3. BEHAVIORAL FRAUD MODEL ==========
        logger.info("\n" + "=" * 80)
        logger.info("3. Training Behavioral Fraud Model (Synthetic)")
        logger.info("=" * 80)
        
        try:
            logger.info("Generating synthetic behavioral dataset...")
            train_df, test_df, scaler = orchestrator.prepare_behavioral_dataset()
            logger.info(f"Training set shape: {train_df.shape}")
            logger.info(f"Test set shape: {test_df.shape}")
            logger.info(f"Fraud ratio: {train_df['is_fraud'].mean():.2%}")
            
            logger.info("Training RandomForest model...")
            metrics = model_manager.train_behavioral_fraud_model(train_df, test_df)
            
            logger.info("\nBehavioral Fraud Model Metrics:")
            for metric, value in metrics.items():
                if metric != 'feature_importance':
                    if isinstance(value, float):
                        logger.info(f"  {metric}: {value:.4f}")
            
            if 'feature_importance' in metrics:
                logger.info("\nTop 5 Important Features:")
                sorted_features = sorted(
                    metrics['feature_importance'].items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:5]
                for feature, importance in sorted_features:
                    logger.info(f"  {feature}: {importance:.4f}")
            
            logger.info("✓ Behavioral fraud model trained successfully")
        
        except Exception as e:
            logger.error(f"✗ Behavioral fraud model training failed: {e}")
            raise
        
        # ========== 4. SAVE MODELS ==========
        logger.info("\n" + "=" * 80)
        logger.info("4. Saving Models")
        logger.info("=" * 80)
        
        if model_manager.save_models():
            logger.info("✓ All models saved successfully")
            
            # Print model paths
            model_path = Path(settings.model_path)
            logger.info("\nModel files saved at:")
            logger.info(f"  {model_path / 'financial_fraud_model.pkl'}")
            logger.info(f"  {model_path / 'financial_fraud_scaler.pkl'}")
            logger.info(f"  {model_path / 'movement_anomaly_model.pkl'}")
            logger.info(f"  {model_path / 'movement_anomaly_scaler.pkl'}")
            logger.info(f"  {model_path / 'behavioral_fraud_model.pkl'}")
            logger.info(f"  {model_path / 'behavioral_fraud_scaler.pkl'}")
        else:
            logger.error("✗ Failed to save models")
            return False
        
        # ========== 5. VERIFY MODELS ==========
        logger.info("\n" + "=" * 80)
        logger.info("5. Verifying Models")
        logger.info("=" * 80)
        
        # Create new manager instance and try to load
        verification_manager = MLModelManager(settings.model_path)
        if verification_manager.load_models():
            logger.info("✓ Models loaded successfully")
            status = verification_manager.get_model_status()
            logger.info(f"  Financial fraud model: {status['financial_fraud_trained']}")
            logger.info(f"  Movement anomaly model: {status['movement_anomaly_trained']}")
            logger.info(f"  Behavioral fraud model: {status['behavioral_fraud_trained']}")
        else:
            logger.error("✗ Failed to load models for verification")
            return False
        
        logger.info("\n" + "=" * 80)
        logger.info("✓ All models trained and saved successfully!")
        logger.info("=" * 80)
        return True
    
    except Exception as e:
        logger.error(f"\n✗ Training pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = train_all_models()
    sys.exit(0 if success else 1)
