import { Router } from 'express';
import {
  loginController,
  demoLoginController,
  selectInstitutionController,
  profileController,
  refreshTokenController,
  logoutController,
  revokeSessionsController,
} from './auth.controller';
import { authenticate } from '../../middleware/authGuard';

const router = Router();

// Public routes
router.post('/login', loginController);
router.post('/demo-login', demoLoginController);
router.post('/refresh', refreshTokenController);
router.post('/logout', logoutController);

// Protected routes
router.post('/select-institution', authenticate, selectInstitutionController);
router.get('/me', authenticate, profileController);
router.post('/revoke-all', authenticate, revokeSessionsController);

export default router;
