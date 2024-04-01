
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProject = async (data) => {
  return prisma.project.create({
    data,
  });
};


const getProjects = async () => {
  return prisma.project.findMany();
};

const associateProjectsToEmployee = async (employeeId, projectIds) => { 
  const updatedEmployee = await prisma.employee.update({
    where: { EmployeeID: employeeId },
    data: {
      projects: { 
        connect: projectIds.map(projectId => ({ ProjectID: projectId }))
      }
    },
  });

  return updatedEmployee;
};
module.exports = {
  associateProjectsToEmployee,
  createProject,
  getProjects,
};
