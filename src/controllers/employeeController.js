const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const employeeModel = require('../models/employeeModel');
const { secretKey } = require('../config/config');
const crypto = require('crypto');

const registerEmployee = async (req, res) => {
  try {
    const { FirstName, LastName, Email, Password, Admin, EmployeeType, name } = req.body;

    // Check if the email is already registered
    const existingEmployee = await employeeModel.getEmployeeByEmail(Email);
    if (existingEmployee) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);
    const employee = await employeeModel.createEmployee({
      FirstName,
      LastName,
      Email,
      Password: hashedPassword,
      Admin,
      EmployeeType,
      name,
    
    });

    res.json({ status: 'success', message: 'Employee registered successfully', data: employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


function md5Hash(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}


const loginEmployee = async (req, res) => {
  try {
    const { Email, Password, Version } = await req.body;
    console.log('Email:', Email);

  
    const employee = await employeeModel.getEmployeeByEmail(Email);
    if (!employee) {
      return res.status(200).json({ message: 'Email is not registered' });
    }

    // console.log('Retrieved employee:', employee);
    // console.log('Password:', Password);
    // console.log('Password:', employee.Password);
    // console.log(await md5Hash(Password));

    // if (!(await bcrypt.compare(Password, employee.Password))) {
    //   return res.status(200).json({ message: 'Invalid credentials' });
    // }
    if (md5Hash(Password) !== employee.Password) {
      return res.status(200).json({ message: 'Invalid credentials' });
    }

    const token = generateToken({ id: employee.EmployeeID, email: employee.Email });
    if(Version !=""){

      const updateResult = await prisma.employee.updateMany({
        where: {
          EmployeeID: employee.EmployeeID, 
        },
        data: {
            Version: Version,
        },
    });
    }

    const status = 'success';
    res.json({ employee, token, status,version: Version });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', err: error });
  }
};

const getEmployeeList = async (req, res) => {
  try {
    const employees = await employeeModel.getEmployees();
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

function generateToken(payload) {
  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
}



const getEmployeeProfile = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await prisma.employee.findUnique({
      where: {
        EmployeeID: parseInt(employeeId),
      },
      include: {
        managingEmployees: {
          select: {
            manager: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
        employeesManagedBy: {
          select: {
            employee: {
              select: {
                FirstName: true,
                LastName: true,
                Timesheets: {
                  select: {
                    Project: {
                      select: {
                        ProjectID: true,
                        ProjectName: true,
                      },
                    },
                    HoursWorked: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const managerFirstName = employee.managingEmployees?.manager?.FirstName;
    const managerLastName = employee.managingEmployees?.manager?.LastName;
    const projects = employee.employeesManagedBy
      .map((relation) =>
        relation.employee.Timesheets.map((timesheet) => ({
          ProjectID: timesheet.Project.ProjectID,
          ProjectName: timesheet.Project.ProjectName,
          HoursWorked: timesheet.HoursWorked || 0,
        }))
      )
      .flat();

    const uniqueProjects = projects.reduce((acc, project) => {
      const existingProject = acc.find(p => p.ProjectID === project.ProjectID);
      if (existingProject) {
        existingProject.HoursWorked += project.HoursWorked;
      } else {
        acc.push(project);
      }
      return acc;
    }, []);

    const employeeProfile = {
      EmployeeID: employee.EmployeeID,
      FirstName: employee.FirstName,
      LastName: employee.LastName,
      l2_manager_name: employee.l2_manager_name,
      reporting_manager_name: employee.reporting_manager_name,
      EmployeesManaged: employee.employeesManagedBy.map((relation) => ({
        FirstName: relation.employee?.FirstName || 'N/A',
        LastName: relation.employee?.LastName || 'N/A',
      })),
      Projects: uniqueProjects,
    };

    res.json({ status: 'success', message: 'Request successful', data: employeeProfile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getEmployeewithManager = async (req, res) => {
  try {
    const employee = await prisma.employee.findMany({
      include: {
        managingEmployees: {
          select: {
            manager: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
        employeesManagedBy: {
          include: {
            manager: {
              select: {
                FirstName: true,
                LastName: true,
              },
            }
          },
        },
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    } 
    res.json({ status: 'success', message: 'Request successful', data: employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const resetEmployeePassword = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { newPassword } = req.body;  

    const updatedEmployee = await employeeModel.resetPassword(parseInt(employeeId), newPassword);

    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ status: 'success', message: 'Password reset successfully', data: updatedEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTotalCounts = async (req, res) => {
  try {    
    const totalEmployees = await prisma.employee.count();   
    const totalProjects = await prisma.project.count();           
    const totalClients = await prisma.client.count();
    res.json({ status: 'success', totalEmployees: totalEmployees, totalProjects: totalProjects,totalClients: totalClients});
  } catch (error) {
    console.error("Error getting total counts:", error);
    throw error;
  }
};

const registerEmployeeWithEmailAndId = async (req, res) => {
  try {
    const { Email, ID, Version } = req.body;

    // Check if the email is already registered
    const existingEmployee = await employeeModel.getEmployeeByEmail(Email);
    if (!existingEmployee) {
      return res.status(400).json({ status: 'false', message: 'Email is not registered' });
    }

    if(Version !=""){
      const updateResult = await prisma.employee.updateMany({
        where: {
          EmployeeID: existingEmployee.EmployeeID, 
        },
        data: {
            Version: Version,
        },
    })
    }

    // Respond with employee data
    res.json({ status: 'success', message: 'Employee registered successfully', data: existingEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getTotalCounts,
  registerEmployeeWithEmailAndId,
  resetEmployeePassword,
  getEmployeeProfile,
  registerEmployee,
  loginEmployee,
  getEmployeeList,
  getEmployeewithManager
};




