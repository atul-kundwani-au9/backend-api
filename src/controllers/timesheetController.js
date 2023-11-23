// const timesheetModel = require('../models/timesheetModel');

// const createTimesheet = async (req, res) => {
//   try {
//     const { EmployeeID, ProjectID, Status, Date, HoursWorked, Description } = req.body;

    
    

   
//     const timesheetData = {
//       EmployeeID,
//       ProjectID,
//       Date ,
//       Status,
//       HoursWorked,
//       Description,
//     };

//     const timesheet = await timesheetModel.createTimesheet(timesheetData);
//     res.json(timesheet);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// const getTimesheetList = async (req, res) => {
//   try {
//     const timesheets = await timesheetModel.getTimesheets();
//     res.json(timesheets);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// module.exports = {
//   createTimesheet,
//   getTimesheetList,
// };



const { PrismaClient } = require('@prisma/client');
const timesheetModel = require('../models/timesheetModel');
const prisma = new PrismaClient();

const createTimesheet = async (req, res) => {
  console.log(req.body)
  try {
    const { EmployeeID, ProjectID, entryDate,Status,Description, HoursWorked,  } = req.body;

   
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        EmployeeID: EmployeeID,
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
   
    const TempDate = new Date(entryDate)
     
    const timesheetData = {
      EmployeeID,
      ProjectID,
      Date:TempDate,      
      Status,
      HoursWorked,
      Description,
    };

    const timesheet = await timesheetModel.createTimesheet(timesheetData);
    res.json(timesheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTimesheetList = async (req, res) => {
  try {
    const timesheets = await timesheetModel.getTimesheets();
    res.json(timesheets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createTimesheet,
  getTimesheetList,
};




