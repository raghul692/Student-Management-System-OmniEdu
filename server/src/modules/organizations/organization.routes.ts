import { Router } from 'express';
import { authenticate } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import {
  getMyInstitutionsController,
  getOrganizationController,
  getInstitutionStatsController,
  createInstitutionController,
  updateInstitutionController,
  toggleInstitutionActiveController,
  getOrganizationUsersController,
} from './organization.controller';

const router = Router();

router.use(authenticate);

router.get('/my-institutions', getMyInstitutionsController);
router.get('/:id', getOrganizationController);
router.get('/:id/stats', institutionContext, getInstitutionStatsController);
router.get('/:id/users', getOrganizationUsersController);

// Institution creation and management (restricted to ORG_ADMIN inside controller)
router.post('/:id/institutions', createInstitutionController);
router.patch('/:id/institutions/:institutionId', updateInstitutionController);
router.patch('/:id/institutions/:institutionId/toggle-active', toggleInstitutionActiveController);

export default router;
