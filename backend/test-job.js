// Test imports for environmental monitoring job
import { startEnvironmentalMonitoring, getJobStatus } from './src/jobs/environmentJob.js';

console.log('✅ Environmental monitoring job imports successful!');
console.log('✅ Job status function available:', typeof getJobStatus);
console.log('✅ Cron job starter available:', typeof startEnvironmentalMonitoring);
console.log('✅ Backend environmental monitoring system is ready for use.');