const express = require('express');
const router = express.Router();

const {
  createUser,
  deleteUser,
  updateUser,
  deleteDevice
} = require('../services/adminService');

const {
  createCustomUser,
  customLogin,
  getAllUsers
} = require('../services/userService');

// Original Supabase auth route
router.post('/users', createUser);

// Custom user route (bypass Supabase auth)
router.post('/users/custom', createCustomUser);

// Custom login route
router.post('/users/login', customLogin);

// Get all users (both profiles and custom_users)
router.get('/users/all', getAllUsers);

router.delete('/users/:id', deleteUser);
router.put('/users/:id', updateUser);

// Device routes
router.delete('/devices/:id', deleteDevice);

module.exports = router;