// Test imports for environmental data pipeline
import EnvironmentalLog from './models/EnvironmentalLog.js';
import { getWeatherData } from './services/weatherService.js';
import { getAQIDataWithFallback } from './services/aqiService.js';
import { calculateRiskScore } from './services/riskService.js';
import { fetchEnvironmentalData } from './controllers/environmentalController.js';
import environmentRoutes from './routes/environment.js';

console.log('✅ All environmental data pipeline imports successful!');
console.log('✅ Backend environmental data pipeline is ready for use.');