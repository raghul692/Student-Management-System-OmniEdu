import { Router } from 'express';
import { authenticate } from '../../middleware/authGuard';
import { institutionContext } from '../../middleware/tenantContext';
import * as admissionController from './admission.controller';

const router = Router();

router.use(authenticate);
router.use(institutionContext);

router.get('/', admissionController.handleListAdmissions);
router.get('/:id', admissionController.handleGetAdmission);
router.post('/', admissionController.handleSubmitAdmission);
router.patch('/:id/review', admissionController.handleReviewAdmission);

export default router;
