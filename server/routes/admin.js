import express from 'express';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', adminController.login);
router.get('/check', auth, requireAdmin, adminController.check);
router.post('/logout', adminController.logout);
router.delete('/users/:id/map-routes', auth, requireAdmin, adminController.deleteUserMapRoutes);

export default router;
