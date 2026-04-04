import express from 'express';
import { getClaims } from '../controllers/claimsController.js';
import { optionalProtect } from '../middlewares/auth.js';

const router = express.Router();
router.use(optionalProtect);
router.get('/', getClaims);

export default router;
