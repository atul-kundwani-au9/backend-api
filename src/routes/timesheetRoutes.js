
const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const authMiddleware = require('../middleware/authMiddleware');
router.put('/approveTimesheet', timesheetController.approveTimesheet);
router.put('/pendingTimesheet', timesheetController.pendingTimesheet)
router.put('/rejectTimesheet', timesheetController.rejectTimesheet);
router.post('/create',authMiddleware.authenticate, timesheetController.createTimesheets);
router.get('/list',authMiddleware.authenticate, timesheetController.getTimesheetList);
router.post('/employee', timesheetController.getTimesheetsByEmployeeAndDateRange);
router.post('/manager', timesheetController.getTimesheetsByManagerAndDateRange )
router.post('/getEmployeesUnderManagerOnSameProject', authMiddleware.authenticate, timesheetController.getEmployeesUnderManagerOnSameProject);
router.post('/getAllTimesheetdata',authMiddleware.authenticate, timesheetController.getAllTimesheetdata);
router.post('/filterEmployee', authMiddleware.authenticate, timesheetController.filterEmployees);
module.exports = router;



