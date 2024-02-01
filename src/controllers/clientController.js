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
// const getEmployeeDetails = async (req, res) => {
//   try {
    
//     const response = await axios.get('http://localhost:4000/auth/employee-details');

    
//     const employeeDetails = response.data;

//     res.json({ status: 'success', data: employeeDetails });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };


const getEmployeeDetails = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:4000/auth/employee-details');
    const externalEmployeeDetails = response.data;

    // if (!Array.isArray(externalEmployeeDetails) && !Array.isArray(externalEmployeeDetails.employees)) {
    //   throw new Error(`Invalid data structure from external API. Expected an array or an object with an "employees" property. Actual data: ${JSON.stringify(externalEmployeeDetails)}`);
    // }

    const employeeArray = Array.isArray(externalEmployeeDetails) ? externalEmployeeDetails : (externalEmployeeDetails && externalEmployeeDetails.employeeDetails) || [];

console.log(employeeArray.length);
    for (const externalEmployee of employeeArray) {
      
      const hashedPassword = await bcrypt.hash(externalEmployee.employeeId, 10);

try {
 
  const createdEmployee = await prisma.employee.create({
    data: {
      EmployeeCode: externalEmployee.employeeId,
      FirstName: externalEmployee.firstname,
      Email: externalEmployee.emailaddress,
      Password: hashedPassword,
      Admin: externalEmployee.emprole_name === "Management" ? 1 : 0,
      EmployeeType: externalEmployee.emprole_name,
      clientId: externalEmployee.clientId,
      DefaultHours: externalEmployee.defaultHours || 8,
      DefaultProject: externalEmployee.defaultProject || 'Sagarsoft',
      DefaultClient: externalEmployee.defaultClient || '',
      DefaultProjectId: externalEmployee.defaultProjectId || '',
      name: externalEmployee.firstname,
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


module.exports = {
  getEmployeeDetails,
  createClient,
  getClientList,
};
