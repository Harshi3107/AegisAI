"""
Fraud Detection Orchestrator
Combines all validation and ML models into a single decision point
"""
from typing import Dict, Optional, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from src.trigger_engine import TriggerEngine, EnvironmentalData
from src.ml_models import MLModelManager
from src.services import LocationValidator, PolicyValidator
from src.config import MODEL_WEIGHTS, FRAUD_THRESHOLDS
import logging

logger = logging.getLogger(__name__)


class ClaimStatus(Enum):
    """Final claim status"""
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPICIOUS = "SUSPICIOUS"
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"


@dataclass
class FraudCheckResult:
    """Result of fraud detection"""
    status: ClaimStatus
    fraud_score: float
    reasons: List[str]
    trigger_type: Optional[str]
    details: Dict


class ClaimFraudDetector:
    """
    Orchestrate the complete claim validation and fraud detection flow
    
    Decision Flow:
    1. Check trigger → IF no trigger → REJECT
    2. Check location → IF mismatch → REJECT
    3. Check time → IF invalid → REJECT
    4. Check policy → IF claims >= 2 → LIMIT_EXCEEDED
    5. Run ML models → Calculate fraud scores
    6. Combine scores → Final decision
    """
    
    def __init__(self, model_manager: MLModelManager):
        self.trigger_engine = TriggerEngine()
        self.model_manager = model_manager
        self.location_validator = LocationValidator()
        self.policy_validator = PolicyValidator()
    
    async def validate_and_detect_fraud(
        self,
        # User data
        user_id: str,
        user_plan: str,
        user_zone: str,
        user_registered_latitude: float,
        user_registered_longitude: float,
        
        # Claim data
        claim_latitude: float,
        claim_longitude: float,
        claim_timestamp: datetime,
        
        # Environmental data
        environmental_data: Dict,  # rainfall_mm_hr, temperature_celsius, aqi, flood_alert
        
        # Policy data
        claims_this_week: int = 0,
        
        # GPS history (optional)
        previous_gps_locations: Optional[List] = None,
        
        # Transaction data (optional)
        transaction_data: Optional[Dict] = None,
        
        # Behavioral data (optional)
        behavioral_data: Optional[Dict] = None,
        
        # Event timestamp (optional, for time validation)
        event_timestamp: Optional[datetime] = None
        
    ) -> FraudCheckResult:
        """
        Complete fraud detection pipeline for a claim
        
        Args:
            user_id: Unique user identifier
            user_plan: User's insurance plan
            user_zone: Risk zone
            user_registered_latitude: Registered city latitude
            user_registered_longitude: Registered city longitude
            claim_latitude: GPS latitude where claim is made
            claim_longitude: GPS longitude where claim is made
            claim_timestamp: When claim was submitted
            environmental_data: Current weather/environmental conditions
            claims_this_week: Number of claims already made this week
            previous_gps_locations: List of (lat, lon, timestamp) tuples
            transaction_data: Financial transaction data
            behavioral_data: Behavioral features
            event_timestamp: When environmental event occurred
        
        Returns:
            FraudCheckResult with decision and explanation
        """
        
        reasons = []
        rejection_reasons = []
        
        # ========== 1. ENVIRONMENTAL TRIGGER VALIDATION ==========
        try:
            env_obj = EnvironmentalData(
                rainfall_mm_hr=environmental_data.get('rainfall_mm_hr', 0),
                temperature_celsius=environmental_data.get('temperature_celsius', 0),
                aqi=environmental_data.get('aqi', 0),
                flood_alert=environmental_data.get('flood_alert')
            )
            
            trigger_result = self.trigger_engine.check_triggers(
                user_plan,
                user_zone,
                env_obj
            )
            
            if not trigger_result.is_valid:
                rejection_reasons.append("No environmental trigger condition met")
                return FraudCheckResult(
                    status=ClaimStatus.REJECTED,
                    fraud_score=0.0,
                    reasons=rejection_reasons,
                    trigger_type=None,
                    details={
                        "validation_stage": "trigger_validation",
                        "environmental_data": environmental_data
                    }
                )
            
            reasons.append(f"Valid trigger: {self.trigger_engine.get_trigger_type(trigger_result.active_triggers).value}")
            trigger_type = self.trigger_engine.get_trigger_type(trigger_result.active_triggers).value
            
        except Exception as e:
            logger.error(f"Error in trigger validation: {e}")
            rejection_reasons.append("Trigger validation error")
            return FraudCheckResult(
                status=ClaimStatus.REJECTED,
                fraud_score=0.0,
                reasons=rejection_reasons,
                trigger_type=None,
                details={"error": str(e)}
            )
        
        # ========== 2. LOCATION VALIDATION ==========
        try:
            location_valid, distance_km = self.location_validator.validate_location(
                claim_latitude,
                claim_longitude,
                user_registered_latitude,
                user_registered_longitude
            )
            
            if not location_valid:
                rejection_reasons.append(
                    f"Location mismatch: {distance_km:.2f}km away from registered city"
                )
                return FraudCheckResult(
                    status=ClaimStatus.REJECTED,
                    fraud_score=0.0,
                    reasons=rejection_reasons,
                    trigger_type=trigger_type,
                    details={
                        "validation_stage": "location_validation",
                        "distance_km": distance_km,
                        "claim_location": (claim_latitude, claim_longitude),
                        "registered_location": (user_registered_latitude, user_registered_longitude)
                    }
                )
            
            reasons.append(f"Location verified ({distance_km:.2f}km from registered city)")
            
            # Check GPS anomalies if history available
            if previous_gps_locations:
                gps_valid, speed_kmh = self.location_validator.validate_location_with_gps_history(
                    claim_latitude,
                    claim_longitude,
                    previous_gps_locations
                )
                
                if not gps_valid:
                    reasons.append(f"GPS anomaly detected: Speed {speed_kmh:.2f}km/h exceeds normal limits")
                else:
                    reasons.append(f"Normal GPS movement: {speed_kmh:.2f}km/h")
        
        except Exception as e:
            logger.error(f"Error in location validation: {e}")
            # Don't reject, just warn
            reasons.append("Location validation skipped due to error")
        
        # ========== 3. TIME VALIDATION ==========
        try:
            if event_timestamp is None:
                event_timestamp = claim_timestamp
            
            time_valid, hours_elapsed = self.policy_validator.validate_claim_timing(
                claim_timestamp,
                event_timestamp,
                max_hours=24
            )
            
            if not time_valid:
                rejection_reasons.append(
                    f"Claim submitted too late: {hours_elapsed:.1f} hours after event"
                )
        
        except Exception as e:
            logger.error(f"Error in time validation: {e}")
            reasons.append("Time validation skipped due to error")
        
        if rejection_reasons:
            return FraudCheckResult(
                status=ClaimStatus.REJECTED,
                fraud_score=0.0,
                reasons=rejection_reasons,
                trigger_type=trigger_type,
                details={"validation_stage": "time_validation"}
            )
        
        # ========== 4. POLICY RULE: MAX CLAIMS PER WEEK ==========
        try:
            policy_valid, policy_msg = self.policy_validator.validate_weekly_claim_limit(claims_this_week)
            
            if not policy_valid:
                return FraudCheckResult(
                    status=ClaimStatus.LIMIT_EXCEEDED,
                    fraud_score=0.0,
                    reasons=[policy_msg],
                    trigger_type=trigger_type,
                    details={"claims_this_week": claims_this_week}
                )
            
            reasons.append(policy_msg)
        
        except Exception as e:
            logger.error(f"Error in policy validation: {e}")
            reasons.append("Policy validation skipped")
        
        # ========== 5. ML FRAUD DETECTION ==========
        fraud_scores = {
            'financial_score': 0.0,
            'movement_score': 0.0,
            'behavior_score': 0.0
        }
        
        # Financial Fraud Detection
        if transaction_data and self.model_manager.financial_fraud_model:
            try:
                financial_prob, confidence = self.model_manager.predict_financial_fraud(transaction_data)
                fraud_scores['financial_score'] = financial_prob
                reasons.append(f"Financial risk score: {financial_prob:.2%} (confidence: {confidence:.2%})")
            except Exception as e:
                logger.error(f"Error in financial fraud detection: {e}")
                reasons.append("Financial risk assessment skipped")
        
        # Movement Anomaly Detection
        if previous_gps_locations and self.model_manager.movement_anomaly_model:
            try:
                movement_data = {
                    'speed': 30.0,  # Example speed
                    'distance': 1.0,
                    'speed_diff': 5.0,
                    'distance_per_speed': 0.033,
                    'speed_rolling_std': 8.0
                }
                if behavioral_data and 'movement' in behavioral_data:
                    movement_data.update(behavioral_data['movement'])
                
                movement_prob, raw_score = self.model_manager.predict_movement_anomaly(movement_data)
                fraud_scores['movement_score'] = movement_prob
                reasons.append(f"Movement anomaly risk: {movement_prob:.2%}")
            except Exception as e:
                logger.error(f"Error in movement anomaly detection: {e}")
                reasons.append("Movement analysis skipped")
        
        # Behavioral Fraud Detection
        if behavioral_data and self.model_manager.behavioral_fraud_model:
            try:
                behavior_prob, explanation = self.model_manager.predict_behavioral_fraud(behavioral_data)
                fraud_scores['behavior_score'] = behavior_prob
                reasons.append(f"Behavioral fraud risk: {behavior_prob:.2%}")
                reasons.append(f"Top risk factors: {', '.join(explanation['top_risk_factors'])}")
            except Exception as e:
                logger.error(f"Error in behavioral fraud detection: {e}")
                reasons.append("Behavioral analysis skipped")
        
        # ========== 6. COMBINE SCORES ==========
        weights = MODEL_WEIGHTS
        final_fraud_score = (
            fraud_scores['financial_score'] * weights['financial'] +
            fraud_scores['movement_score'] * weights['movement'] +
            fraud_scores['behavior_score'] * weights['behavior']
        )
        
        final_fraud_score = min(1.0, max(0.0, final_fraud_score))
        
        # ========== 7. FINAL DECISION ==========
        fraud_threshold = FRAUD_THRESHOLDS['combined_score']
        
        if final_fraud_score > fraud_threshold:
            status = ClaimStatus.SUSPICIOUS
            reasons.append(f"FRAUD ALERT: Combined score {final_fraud_score:.2%} exceeds threshold {fraud_threshold:.2%}")
        else:
            status = ClaimStatus.APPROVED
            reasons.append(f"Claim approved. Fraud score: {final_fraud_score:.2%} (below {fraud_threshold:.2%} threshold)")
        
        return FraudCheckResult(
            status=status,
            fraud_score=final_fraud_score,
            reasons=reasons,
            trigger_type=trigger_type,
            details={
                "individual_scores": fraud_scores,
                "weights": weights,
                "claims_this_week": claims_this_week,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


if __name__ == "__main__":
    print("Fraud detection orchestrator module loaded successfully")
