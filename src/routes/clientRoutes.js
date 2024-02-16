
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const authMiddleware = require('../middleware/authMiddleware');
router.post('/create',authMiddleware.authenticate, clientController.createClient);
router.get('/list',authMiddleware.authenticate, clientController.getClientList);
router.get('/employee-details', authMiddleware.authenticate, clientController.getEmployeeDetails);
router.get('/manager-employee-counts', authMiddleware.authenticate, clientController.getManagerEmployeeCounts);
router.get('/employees-under-manager/:employeeId', authMiddleware.authenticate, clientController.getEmployeesUnderManager); 


module.exports = router;



