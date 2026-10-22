const express = require('express');
const router = express.Router();
const { getUsers, getUserByEmail, getMyProfile, updateMyProfile } = require('../controller/user.controller');
const { authanicate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/', authanicate, authorize('admin'), getUsers);
router.get('/profile', authanicate, getMyProfile);
router.put('/profile', authanicate, updateMyProfile);
router.get('/:email', getUserByEmail);

module.exports = router;