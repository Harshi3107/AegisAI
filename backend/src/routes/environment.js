import express from 'express';
import {
  fetchEnvironmentalData,
  getEnvironmentalLogs,
  getLatestEnvironmentalData,
  simulateEnvironmentalEvent,
  getLocationRiskProfile
} from '../controllers/environmentalController.js';
import { protect, optionalProtect } from '../middlewares/auth.js';
import { getJobStatus } from '../jobs/environmentJob.js';

const router = express.Router();

router.post('/fetch', protect, fetchEnvironmentalData);
router.post('/simulate', optionalProtect, simulateEnvironmentalEvent);
router.get('/logs', getEnvironmentalLogs);
router.get('/latest', getLatestEnvironmentalData);
router.get('/location-risk', getLocationRiskProfile);
router.get('/job-status', (req, res) => {
  const status = getJobStatus();
  res.status(200).json({
    success: true,
    data: status
  });
});

export default router;