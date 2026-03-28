import express from 'express';
import auth from '../middleware/auth.js';
import requireUser from '../middleware/requireUser.js';
import * as mapRoutesController from '../controllers/mapRoutesController.js';

const router = express.Router();

router.get('/', auth, requireUser, mapRoutesController.list);
router.get('/:id', auth, requireUser, mapRoutesController.getById);
router.post('/', auth, requireUser, mapRoutesController.create);
router.patch('/:id/points', auth, requireUser, mapRoutesController.patchPoints);
router.patch('/:id', auth, requireUser, mapRoutesController.patch);
router.put('/:id', auth, requireUser, mapRoutesController.put);
router.delete('/:id', auth, requireUser, mapRoutesController.remove);

export default router;
