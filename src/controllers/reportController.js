
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getClientReport = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const clientReport = await prisma.timesheet.findMany({
      where: {
        Project: {
          ClientID: clientId,
        },
      },
      include: {
        Employee: true,
        Project: true,
      },
    });
    const status = "success";
    res.json(clientReport,status);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getProjectReport = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const projectReport = await prisma.timesheet.findMany({
      where: {
        ProjectID: projectId,
      },
      include: {
        Employee: true,
        Project: true,
      },
    });
    
    const response = {
      status: 'success',
      data: projectReport,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
const getEmployeeReport = async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const employeeReport = await prisma.timesheet.findMany({
      where: {
        EmployeeID: employeeId,
      },
      include: {
        Employee: true,
        Project: true,
      },
    });    
    const response = {
      status: 'success',
      data: employeeReport,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
const getManagerReport = async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.body;
    // const managedEmployees = await prisma.managerEmployee.findMany({
    //   where: {
    //     managerId: parseInt(managerId),
    //   },
    //   select: {
    //     employeeId: true,
    //     employee: {
    //       select: {
    //         FirstName: true,
    //         LastName: true,
    //       },
    //     },
    //   },
    // });
    const employees1 = await prisma.employee.findMany({
      where: {
        EmployeeID: parseInt(managerId) 
      }
    });
    const managerEmployees = await prisma.employee.findMany({
      where: {
        reporting_manager_id: employees1[0].EmployeeCode
      },
    });

    const employeesReport = await Promise.all(
      managerEmployees.map(async (managedEmployee) => {
        const submittedTimesheets = await prisma.employee.findMany({
          where: {
            EmployeeID: managedEmployee.EmployeeID,
            Timesheets: {
              some: {
                Date: {
                  gte: new Date(startDate),
                  lte: new Date(endDate),
                },
                OR: [
                  { Status: 'pending' },
                  { Status: 'approved' },
                ],
              },
            },
          },
        });

        return {
          employeeId: managedEmployee.EmployeeID,
          FirstName: managedEmployee.FirstName,
          LastName: managedEmployee.LastName,
          submitted: submittedTimesheets.length > 0,
        };
      })
    );
    console.log(employeesReport);

    const submittedEmployees = employeesReport.filter((employee) => employee.submitted);
    const notSubmittedEmployees = employeesReport.filter((employee) => !employee.submitted);

    const response = {
      submittedEmployees: submittedEmployees,
      notSubmittedEmployees: notSubmittedEmployees,
      totalSubmitted: submittedEmployees.length,
      totalNotSubmitted: notSubmittedEmployees.length,
      status: 'success',
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getManagerReport,
  getClientReport,
  getProjectReport,
  getEmployeeReport,
};
