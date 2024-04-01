const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTimesheets = async () => {
  return prisma.timesheet.findMany({
    include: {
      Employee: true,
      Project: true,
    },
  });
};

const createTimesheet = async (data) => {
  const { EmployeeID, ProjectID, Date, HoursWorked, Status, Description,WorkFromHome } = data;
  const existingTimesheet = await prisma.timesheet.findFirst({
    where: {
      EmployeeID: EmployeeID,
      ProjectID: ProjectID,
      Date:Date,
    },
  });
  if (existingTimesheet) {
    await prisma.timesheet.delete({
      where: {
        TimesheetID: existingTimesheet.TimesheetID,
      },
    });

  }
  
  const updatedTimesheet = await prisma.timesheet.create({
   
    data: {
      EmployeeID,
      ProjectID,
      Date,
      HoursWorked,
      Status,
      Description,
      WorkFromHome
    },
  });

  return updatedTimesheet;

};
const getTimesheetsByEmployeeAndDateRange = async (employeeId, startDate, endDate) => {
  return prisma.timesheet.findMany({
    where: {
      isActive:1,
     
      EmployeeID: employeeId,
      Date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      Employee: true,
      Project: true,
    },
  });
};

const getTimesheetsByManagerAndDateRange = async (managerId, startDate, endDate) => {
  return prisma.timesheet.findMany({
    where: {
      Employee: {
        managingEmployees: {
          some: {
            managerId: managerId,
          },
        },
      },
      Date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      TimesheetID: true,
      EmployeeID: true,
      ProjectID: true,
      Date: true,
      Status: true,
      HoursWorked: true,
      Description: true,
      Project: true,
      Employee: true,
    },
  });
};
module.exports = {
  getTimesheetsByManagerAndDateRange,
  createTimesheet,
  getTimesheets,
  getTimesheetsByEmployeeAndDateRange,
};
  