
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const createEmployee = async (data) => {
  return prisma.employee.create({
    data,
  });
};
const getEmployeeByEmail = async (Email) => {
  return prisma.employee.findUnique({
    where: {
      Email: Email,
      isActive:1
    },
  });
};
const getEmployeeById = async (employeeId) => {
  return prisma.employee.findUnique({
    where: {
      EmployeeID: employeeId,
    },
  });
};
const getEmployees = async () => {
  return prisma.employee.findMany();
};

const getEmployeeProfileById = async (employeeId) => {
  return prisma.employee.findUnique({
    where: {
      EmployeeID: employeeId,
    },
    include: {
      managingEmployees: {
        include: {
          manager: true, 
        },
      },
      employeesManagedBy: {
        include: {
          employee: true, 
        },
      },
    },
  });
};

const resetPassword = async (employeeId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  return prisma.employee.update({
    where: {
      EmployeeID: employeeId,
    },
    data: {
      Password: hashedPassword,
    },
  });
};



module.exports = {
  getEmployeeById,
  resetPassword,
  createEmployee,
  getEmployeeByEmail,
  getEmployees,
  getEmployeeProfileById
};
