import express from 'express';
import * as setPasswordController from '../controllers/setPasswordController.js';

const router = express.Router();

router.get('/validate/:token', setPasswordController.validateToken);
router.post('/', setPasswordController.setPassword);

export default router;
