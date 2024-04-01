const clientModel = require('../models/clientModel');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

const createClient = async (req, res) => {
  try {
    const { ClientName, ContactPerson, ContactEmail } = req.body;
    const client = await clientModel.createClient({
      ClientName,
      ContactPerson,
      ContactEmail,
    });
    res.json({ status: 'success', message: 'Client created successfully', data: client });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getClientList = async (req, res) => {
  try {
    const clients = await clientModel.getClients();
    res.json({ status: 'success',  data: clients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const getEmployeeDetails = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:4000/auth/newemployees');
    const externalEmployeeDetails = response.data;

 

    const employeeArray = Array.isArray(externalEmployeeDetails) ? externalEmployeeDetails : (externalEmployeeDetails && externalEmployeeDetails.employeeDetails) || [];

// console.log(employeeArray.length);
    for (const externalEmployee of employeeArray) {
      
    

try {

//   const updateResult = await prisma.employee.updateMany({
//     where: {
//       EmployeeCode:  externalEmployee.employeeId, 
//     },
//     data: {
//       Password: externalEmployee.emppassword,
//     },
// });

 
  const createdEmployee = await prisma.employee.create({
    data: {
      EmployeeCode: externalEmployee.employeeId,
      FirstName: externalEmployee.firstname,
      LastName:externalEmployee.lastname || "",
      Email: externalEmployee.emailaddress,
      Password: externalEmployee.emppassword,
      Admin: externalEmployee.emprole_name === "Management" ? 1 : 0,
      EmployeeType: externalEmployee.emprole_name,
      clientId: externalEmployee.clientId,
      DefaultHours: externalEmployee.defaultHours || 8,
      DefaultProject: externalEmployee.defaultProject || 'Sagarsoft',
      DefaultClient: externalEmployee.defaultClient || "17",
      DefaultProjectId: externalEmployee.defaultProjectId || "58",
      name: externalEmployee.firstname,
      l2_manager_name: externalEmployee.l2_manager_name || "",
      reporting_manager_name: externalEmployee.reporting_manager_name || "",
      // reporting_manager:externalEmployee.reporting_manager ,
      // l2_manager:externalEmployee.l2_manager , 
      l2_id:externalEmployee.l2_id || "",   
      reporting_manager_id:externalEmployee.reporting_manager_id || "",
      isActive:externalEmployee.isactive
    },
  });

  console.log(`Created or updated employee: ${createdEmployee.EmployeeCode}`);
} catch (error) {
  
  if (error.code === 'P2002' && error.meta?.target?.includes('Email')) {
    console.error(`Duplicate email address: ${externalEmployee.emailaddress}`);
    
  } else {    
    throw error;
  }
}
}

res.json({ status: 'success', message: 'Employees created or updated successfully' });
} catch (error) {
console.error(error.message);
res.status(500).json({ error: 'Internal Server Error' });
}
};

const getLeaveDetails = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:4000/auth/user-leaves');
    const externalLeaveDetails = response.data;
    const leaveArray = Array.isArray(externalLeaveDetails) ? externalLeaveDetails : (externalLeaveDetails && externalLeaveDetails.leaves) || [];

    // const leaveArray = Array.isArray(externalLeaveDetails) ? externalLeaveDetails : (externalLeaveDetails && externalLeaveDetails.leaveDetails);
    // console.log(`Created : ${JSON.stringify(externalLeaveDetails)}`);
    console.log(externalLeaveDetails);

    for (const externalLeave of leaveArray) {
      try {
        const createdLeave = await prisma.leave.create({
          data: {
            EmployeeCode: externalLeave.employeeId,
            FirstName:externalLeave.firstname,
            LastName:externalLeave.lastname,
            LeaveTypeID: externalLeave.leavetypeid,
            LeaveDay: externalLeave.leaveday,
            FromDate: externalLeave.from_date,
            ToDate: externalLeave.to_date,
            Reason: externalLeave.reason,
            leavestatus: externalLeave.leavestatus
          },
        });

        console.log(`Created or updated leave for employee: ${createdLeave.EmployeeCode}`);
      } catch (error) {
        console.error('Error creating or updating leave:', error);
        throw error;
      }
    }

    res.json({ status: 'success', message: 'Leaves created or updated successfully' });
  } catch (error) {
    console.error('Error fetching external leave details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const getManagerEmployeeCounts = async (req, res) => {
  try {
    const managers = await prisma.employee.findMany({
      where: {
        EmployeeType: 'manager'
      },
      include: {
        managingEmployees: true
      }
    });
   
    const managerEmployeeCountMap = new Map();   
    managers.forEach(manager => {
      const employeeCount = manager.managingEmployees.length;
      managerEmployeeCountMap.set(manager.EmployeeID, employeeCount);
    });

    res.json({ status: 'success', managerEmployeeCounts: Array.from(managerEmployeeCountMap.entries()) });
  } catch (error) {
    console.error('Error fetching manager employee counts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getEmployeesUnderManager = async (req, res) => {
  try {
    const { employeeId } = req.params;   
    const employees = await prisma.employee.findMany({
      where: {
        reporting_manager_id: employeeId 
      }
    });

    // Return the result
    res.json({ status: 'success', data: employees });
  } catch (error) {
    console.error('Error fetching employees under manager:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createMiscellaneousEntry = async (req, res) => {
  try {
    const { GoogleClientID, Status } = req.body;
    
    if (!GoogleClientID || typeof Status !== 'boolean') {
      return res.status(400).json({ error: 'Invalid input data' });
    }    
    const newEntry = await prisma.$executeRaw`
      INSERT INTO miscellaneous (GoogleClientID, Status)
      VALUES (${GoogleClientID}, ${Status ? 1 : 0})
    `;
   
    res.json({ status: 'success',  data: { GoogleClientID, Status } } );
  } catch (error) {
    console.error('Error creating entry in Miscellaneous  table:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getMiscellaneousEntries = async (req, res) => {
  try {    
    const entries = await prisma.$queryRaw`SELECT * FROM miscellaneous `;    
    res.json({ status: 'success', data: entries });
  } catch (error) {
    console.error('Error fetching entries from Miscellaneous  table:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { 
  getMiscellaneousEntries,
  createMiscellaneousEntry,
  getLeaveDetails,
  getEmployeesUnderManager,
  getManagerEmployeeCounts,
  getEmployeeDetails,
  createClient,
  getClientList,
};
