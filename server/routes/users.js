import express from 'express';
import auth from '../middleware/auth.js';
import * as usersController from '../controllers/usersController.js';

const router = express.Router();

router.post('/login', usersController.login);
router.get('/me', auth, usersController.me);
router.post('/logout', usersController.logout);
router.get('/', auth, usersController.list);
router.post('/', usersController.create);
router.get('/:id', auth, usersController.getById);
router.delete('/:id', auth, usersController.remove);
router.put('/:id', auth, usersController.update);

export default router;
