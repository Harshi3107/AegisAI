# Parametric Micro-Insurance Backend API

A Node.js/Express backend API for a parametric micro-insurance platform with JWT authentication and location services.

## Features

- **User Authentication**: Register and login with JWT tokens
- **Location Services**: Convert coordinates to city names using Mapbox API
- **User Management**: Profile management and location updates
- **Security**: Password hashing, JWT protection, rate limiting, CORS
- **Error Handling**: Comprehensive error handling middleware
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Location API**: Mapbox Geocoding API
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # MongoDB connection
│   │   └── jwt.js          # JWT utilities
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   └── userController.js    # User management logic
│   ├── services/
│   │   └── mapService.js        # Mapbox API integration
│   ├── models/
│   │   └── User.js             # User mongoose model
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   └── user.js             # User routes
│   ├── middlewares/
│   │   ├── auth.js             # JWT authentication middleware
│   │   └── error.js            # Error handling middleware
│   ├── jobs/
│   │   └── environmentJob.js   # Cron job for environmental monitoring
│   └── server.js               # Main server file
├── .env                        # Environment variables
├── package.json
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/parametric-insurance
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   MAPBOX_TOKEN=your-mapbox-token-here
   AQICN_TOKEN=your-aqicn-token-here
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### User Management
- `POST /api/user/location` - Update user location (protected)
- `GET /api/user/profile` - Get user profile (protected)
- `PUT /api/user/profile` - Update user profile (protected)

### Environmental Data
- `POST /api/environment/fetch` - Fetch and store environmental data (protected)
- `GET /api/environment/logs` - Get environmental logs with pagination (protected)
- `GET /api/environment/latest` - Get latest environmental data for location (protected)
- `GET /api/environment/job-status` - Get cron job status (protected)

### Health Check
- `GET /health` - API health check
- `GET /` - API information

## API Usage Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Update Location
```bash
POST /api/user/location
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "lat": 28.6139,
  "lng": 77.2090
}
```

### Fetch Environmental Data
```bash
POST /api/environment/fetch
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "lat": 28.6139,
  "lng": 77.2090
}
```

### Get Environmental Logs
```bash
GET /api/environment/logs?lat=28.6139&lng=77.2090&limit=10&page=1
Authorization: Bearer <jwt-token>
```

### Get Latest Environmental Data
```bash
GET /api/environment/latest?lat=28.6139&lng=77.2090
Authorization: Bearer <jwt-token>
```

## Automated Environmental Monitoring

The system includes an automated cron job that collects environmental data every 5 minutes for all users with valid location data.

### Features
- **Scheduled Collection**: Runs automatically every 5 minutes using node-cron
- **User-Based Processing**: Processes all users with valid location coordinates
- **Error Resilience**: Individual user failures don't stop the entire job
- **Duplicate Prevention**: Avoids storing redundant data within 4-minute windows
- **Comprehensive Logging**: Detailed console logging for monitoring and debugging

### Job Status Monitoring
```bash
GET /api/environment/job-status
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "lastRunTime": "2026-04-03T10:30:00.000Z",
    "runCount": 42,
    "nextRun": "2026-04-03T10:35:00.000Z"
  }
}
```

### Data Collection Flow
1. **Fetch Active Users**: Query users with valid location data
2. **Weather Data**: Call Open-Meteo API for temperature and precipitation
3. **Air Quality Data**: Call AQICN API for AQI (with fallback)
4. **Risk Calculation**: Compute composite risk score using custom algorithm
5. **Data Storage**: Store all data in EnvironmentalLogs collection

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `MAPBOX_TOKEN` | Mapbox API token for geocoding | Yes |
| `AQICN_TOKEN` | AQICN API token for air quality data | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment mode | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents abuse with request limits
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers
- **Input Validation**: Comprehensive validation on all endpoints

## Error Handling

The API includes comprehensive error handling:
- Validation errors
- Authentication errors
- Database errors
- External API errors
- Server errors

All errors return a consistent JSON format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Development

- Uses ES6 modules (`"type": "module"` in package.json)
- Hot reload in development mode with `--watch` flag
- Structured logging for debugging
- Modular architecture for easy maintenance

## License

ISC