
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
router.get('/client/:clientId',authMiddleware.authenticate, reportController.getClientReport);
router.get('/project/:projectId', authMiddleware.authenticate,reportController.getProjectReport);
router.get('/employee/:employeeId', authMiddleware.authenticate,reportController.getEmployeeReport);
router.post('/report', authMiddleware.authenticate, reportController.getManagerReport);
// router.post('/client-report', authMiddleware.authenticate, reportController.createClientReport);
module.exports = router;
