const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const { getISOWeek, format ,startOfYear, differenceInDays} = require('date-fns');
const enUS = require('date-fns/locale/en-US');
const pool = require('../config/config');
const axios = require('axios');
const createManagerEmployee = async (req, res) => {
    try {
      const { managerId, employeeId } = req.body;  
      
      const managerIdInt = parseInt(managerId);
      const employeeIdInt = parseInt(employeeId);  
     
      const managerExists = await prisma.employee.findUnique({
        where: { EmployeeID: managerIdInt },
      });
  
      const employeeExists = await prisma.employee.findUnique({
        where: { EmployeeID: employeeIdInt },
      });
  
      if (!managerExists || !employeeExists) {
        return res.status(404).json({ error: 'Manager or Employee not found' });
      }
       
      const managerEmployee = await prisma.managerEmployee.create({
        data: {
          manager: { connect: { EmployeeID: managerIdInt } },
          employee: { connect: { EmployeeID: employeeIdInt } },
        },
      });
     
      res.json({status: 'success', message: 'Request successful', data:managerEmployee});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  const getManagerEmployees = async (req, res) => {
  try {
    const managerEmployees = await prisma.managerEmployee.findMany({
      include: {
        manager: true,
        employee: true,
      },
    });
    
    res.json({status: 'success', message: 'Request successful', data:managerEmployees});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getManagerProfile = async (req, res) => {
  try {
    const { managerId } = req.params;

    const manager = await prisma.employee.findUnique({
      where: {
        EmployeeID: parseInt(managerId),
      },
      include: {
        managingEmployees: {
          select: {
            employee: {
              select: {
                FirstName: true,
                LastName: true,
              },
            },
          },
        },
        Timesheets: {
          select: {
            Project: {
              select: {
                ProjectID: true,
                ProjectName: true,
              },
            },
          },
        },
      },
    });

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const managerFirstName = manager.FirstName;
    const managerLastName = manager.LastName;
    const managerProfile = {
      ManagerID: manager.EmployeeID,
      FirstName: managerFirstName,
      LastName: managerLastName,
      Employees: manager.managingEmployees.map((relation) => ({
        FirstName: relation.employee?.FirstName || 'N/A',
        LastName: relation.employee?.LastName || 'N/A',
      })),
      Projects: manager.Timesheets.map((timesheet) => ({
        ProjectID: timesheet.Project.ProjectID,
        ProjectName: timesheet.Project.ProjectName,
      })),
    };

    res.json({status: 'success', message: 'Request successful', data:managerProfile});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const createManagerEmployeesWithHours = async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.body;

    const managerEmployees = await prisma.managerEmployee.findMany({
      where: {
        managerId: parseInt(managerId),
      },
      include: {
        manager: true,
        employee: true,
      },
    });
    
    const managerEmployeesWithHours = await Promise.all(managerEmployees.map(async (relation) => {
      const emps = Array.isArray(relation.employee) ? relation.employee : [relation.employee];
      const list_of_timesheets = [];
    
      for (const emp of emps) {
        let obj = {
          ...emp,
          status: 'pending', 
        };
        let timedata = [];
        
        try {
          const data = await getTimesheet(emp.EmployeeID, startDate, endDate);
          timedata = data;

          // obj.status = timedata.some((element) => element.Status !== 'approved') ? 'pending' : 'approved';
          if (timedata.some((element) => element.Status === 'rejected')) {
            obj.status = 'pending';
          }
          if (timedata.some((element) => element.Status === 'approved')) {
            obj.status = 'approved';
          }else {
            obj.status = 'pending';
          }
          timedata.forEach(element => {
            obj['hours'] = (obj['hours'] || 0) + (element.HoursWorked || 0);
          });
    
          list_of_timesheets.push(obj);
        } catch (error) {
          console.error(`Error fetching timesheet for EmployeeID ${emp.EmployeeID}:`, error);
        }
      }
    
      return list_of_timesheets;
    }));
    
    const response = {
      status: 'success',
      data: managerEmployeesWithHours,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

async function getTimesheet(employeeId, startDate, endDate) {
  try {
    console.log(employeeId, startDate, endDate);

    const timesheets = await prisma.timesheet.findMany({
      where: {
        EmployeeID: employeeId,
        Date: {
          gte: new Date(startDate + 'T00:00:00Z'),  
          lte: new Date(endDate + 'T23:59:59Z'),    
        },
      },
    });

    console.log(timesheets);
    return timesheets;
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    throw error;
  }
}

const getManagers = async (req, res) => {
  try {
    const managers = await prisma.employee.findMany({
      where: {
        EmployeeType: 'manager', 
      },
      select: {
        EmployeeID: true,
        FirstName: true,
        LastName: true,
      },
    });

    res.json({status: 'success', message: 'Request successful', data:managers});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const exportCSV = async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.body;
    const jsonData = await generateCSVData(managerId, startDate, endDate);
    const currentDate = new Date().toLocaleDateString('en-IN');
    const formattedDate = currentDate.replace(/\//g, '-');
    const fileName = `exported-data-${formattedDate}.csv`;
    const filePath = `public/${fileName}`;
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'Manager Name', title: 'Manager Name' },
        { id: 'Employee Name', title: 'Employee Name' },
        { id: 'Total Hours Worked', title: 'Total Hours Worked' },
        { id: 'Client ID', title: 'Client ID' },
      ],
    });
    
    await csvWriter.writeRecords(jsonData);    
    res.download(filePath, fileName);
    res.status(200).json(jsonData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const generateCSVData = async (managerId, startDate, endDate) => {
  
  const managerEmployeesWithHours = await prisma.managerEmployee.findMany({
    where: {
      managerId: parseInt(managerId),
    },
    include: {
      manager: {
        select: {
          FirstName: true,
          LastName:true,
        },
      },
      employee: {
        select: {
          FirstName: true,
          LastName:true,
          clientId: true,          
          
        },
      },
    },
  });
    const csvDataPromises = managerEmployeesWithHours.map(async (relation) => {       
    const managerName = relation.manager ? relation.manager.FirstName + ' ' + relation.manager.LastName : 'N/A';   
    const employeeName = relation.employee ? relation.employee.FirstName + ' ' + relation.employee.LastName: 'N/A';
    const totalHours = await calculateTotalHours(relation.employee, startDate, endDate);
    const totalClientHours = await calculateTotalClient(relation.employee, startDate, endDate);   
    const clientId = relation.employee && relation.employee.clientId !== null ? relation.employee.clientId : 'N/A';

    return {
      'Manager Name': managerName,
      'Employee Name': employeeName,
      'Total Hours Worked': totalHours,
      'Client ID': clientId,
      'Total Client Hours': totalClientHours,
    };
  });
  
  const csvData = await Promise.all(csvDataPromises);
  console.log(csvData);
  return csvData;
};
const calculateTotalHours = async (employee, startDate, endDate) => {
    const timesheets = await prisma.timesheet.findMany({
      where: {
        EmployeeID: employee.EmployeeID,
        Date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });
  
    const totalHours = timesheets.reduce((total, timesheet) => total + parseFloat(timesheet.HoursWorked), 0);  
    return totalHours;
  };

const calculateTotalClient = async (employee, startDate, endDate) => {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      EmployeeID: employee.EmployeeID,
      Date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  let data_client = {};
  timesheets.forEach((row) => {
    const clientId = row.clientId;
    const hoursWorked = parseFloat(row.hours);    
    if (clientId !== undefined) {
      if (!data_client[clientId]) {
        data_client[clientId] = 0;
      }
      data_client[clientId] += hoursWorked;
    }
  });
  const dataClientString = Object.entries(data_client).map(([key, value]) => `${key}:${value}`).join(', ');
  return dataClientString;
};


const getManagerData = async (req, res) => {
  try {
    const { managerId } = req.params;
    const managerEmployeesWithHours = await prisma.managerEmployee.findMany({
      where: {
        managerId: parseInt(managerId),
      },
      include: {
        manager: {
          select: {
            FirstName: true,
            LastName: true,
          },
        },
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
                    
                    Client: {
                      select: {
                        ClientID: true,
                        ClientName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const clientSet = new Set();
    const projectSet = new Set();
    const clientList = [];
    const projectList = [];

    managerEmployeesWithHours.forEach((relation) => {
      if (relation.employee && relation.employee.Timesheets) {
        relation.employee.Timesheets.forEach((timesheet) => {
          const project = timesheet.Project;

          if (project) {
            const clientId = project.Client.ClientID;
            const projectId = project.ProjectID;

            if (!clientSet.has(clientId)) {
              clientSet.add(clientId);
              clientList.push({
                ClientID: clientId,
                ClientName: project.Client.ClientName,
              });
            }

            if (!projectSet.has(projectId)) {
              projectSet.add(projectId);
              projectList.push({
                ProjectID: projectId,
                ProjectName: project.ProjectName,
                ClientID: clientId,
              });
            }
          }
        });
      }
    });

    res.json({
      managerName: `${managerEmployeesWithHours[0].manager.FirstName} ${managerEmployeesWithHours[0].manager.LastName}`,
      clientList,
      projectList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const exportEmployeeCSV = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;
    const employeeData = await generateEmployeeCSVData(employeeId, startDate, endDate);
    const currentDate = new Date().toLocaleDateString('en-IN');
    const formattedDate = currentDate.replace(/\//g, '-');
    const fileName = `employee-report-${formattedDate}.csv`;
    const filePath = `public/${fileName}`;

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'Employee Name', title: 'Employee Name' },
        { id: 'Total Hours Worked', title: 'Total Hours Worked' },
        { id: 'Client ID', title: 'Client ID' },
      ],
    });

    await csvWriter.writeRecords(employeeData);
    res.download(filePath, fileName);
    // res.status(200).json(employeeData);
    res.status(200).json({ status: 'success', message: 'Request successful', data: employeeData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const generateEmployeeCSVData = async (employeeId, startDate, endDate) => {
  const employee = await prisma.employee.findUnique({
    where: {
      EmployeeID: parseInt(employeeId),
    },
  });

  const totalHours = await calculateTotalHours(employee, startDate, endDate);
  const totalClientHours = await calculateTotalClient(employee, startDate, endDate);
  const clientId = employee.clientId !== null ? employee.clientId : 'N/A';
  const employeeData = {
    'Employee Name': `${employee.FirstName} ${employee.LastName}`,
    'Total Hours Worked': totalHours,
    'Client ID': clientId,
    'Total Client Hours': totalClientHours,
  };

  console.log(employeeData);
  return [employeeData];
};
const exportEmployeesCSV = async (req, res) => {
  try {
    const { employeeIds, startDate, endDate } = req.body;
    const employeesData = await generateEmployeesCSVData(employeeIds, startDate, endDate);
    const currentDate = new Date().toLocaleDateString('en-IN');
    const formattedDate = currentDate.replace(/\//g, '-');
    const fileName = `employees-report-${formattedDate}.csv`;
    const filePath = `public/${fileName}`;

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'Employee Name', title: 'Employee Name' },
        { id: 'Total Hours Worked', title: 'Total Hours Worked' },
        { id: 'Client ID', title: 'Client ID' },
      ],
    });

    await csvWriter.writeRecords(employeesData);
    res.download(filePath, fileName);
    // res.status(200).json(employeesData);
    res.status(200).json({ status: 'success', message: 'Request successful', data: employeesData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const generateEmployeesCSVData = async (employeeIds, startDate, endDate) => {
  const employeesDataPromises = employeeIds.map(async (employeeId) => {
    const employee = await prisma.employee.findUnique({
      where: {
        EmployeeID: parseInt(employeeId),
      },
    });

    const totalHours = await calculateTotalHours(employee, startDate, endDate);
    const totalClientHours = await calculateTotalClient(employee, startDate, endDate);
    const clientId = employee.clientId !== null ? employee.clientId : 'N/A';

    return {
      'Employee Name': `${employee.FirstName} ${employee.LastName}`,
      'Total Hours Worked': totalHours,
      'Client ID': clientId,
      'Total Client Hours': totalClientHours,
    };
  });

  const employeesData = await Promise.all(employeesDataPromises);
 
  return employeesData;
};

const getWeek = (date) => {
  const startOfYearDate = startOfYear(date);
  const differenceDays = differenceInDays(date, startOfYearDate);
  const weekNumber = Math.ceil((differenceDays + 1) / 7);
  return weekNumber;
};
const exportEmployeeCSVs = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;
    const employeeData = await generateEmployeeCSVDatas(employeeId, startDate, endDate);
    const currentDate = new Date().toLocaleDateString('en-IN');
    const formattedDate = currentDate.replace(/\//g, '-');
    const fileName = `employee-report-${formattedDate}.csv`;
    const filePath = `public/${fileName}`;
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'Name', title: 'Name' },
        { id: 'Client', title: 'Client' }, 
        { id: 'Project', title: 'Project' }, 
        { id: 'Month', title: 'Month' },
        { id: 'Week 1', title: 'Week 1' },
        { id: 'Week 2', title: 'Week 2' },
        { id: 'Week 3', title: 'Week 3' },
        { id: 'Week 4', title: 'Week 4' },
        { id: 'Week 5', title: 'Week 5' },
        { id: 'Total Actual Hours', title: 'Total Actual Hours' },
        { id: 'Total Billable Hours', title: 'Total Billable Hours' },
        { id: 'Comments', title: 'Comments' },
      ],
    });
    await csvWriter.writeRecords(employeeData);    
    res.download(filePath, fileName);
    res.status(200).json(employeeData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const getEmployeeLeaves = async (employeeId) => {
  try {
    const response = await axios.get(`http://localhost:4000/auth/user-leaves/${employeeId}`);
    return response.data.leaves; 
  } catch (error) {
    console.error(`Error fetching leaves for employee ${employeeId}:`, error);
    return [];
  }
};
const getMonthWiseLeaves = (leaves, startDate, endDate) => {
  const monthWiseLeaves = {};
  const start = new Date(startDate);
  const end = new Date(endDate);  
  leaves.forEach((leave) => {
    const leaveDate = new Date(leave.from_date);
    
    // Check if the leave is within the specified date range
    if (leaveDate >= start && leaveDate <= end) {
      const month = format(leaveDate, 'MMMM', { locale: enUS });

      if (!monthWiseLeaves[month]) {
        monthWiseLeaves[month] = [];
      }

      monthWiseLeaves[month].push({
        leaveday: leave.leaveday,
        from_date: leave.from_date,
        to_date: leave.to_date,
      });
    }
  });

  return monthWiseLeaves;
};
const generateEmployeeCSVDatas = async (employeeIds, startDate, endDate) => {
  if (!Array.isArray(employeeIds)) {
    employeeIds = [employeeIds];
  }
 
  const employeesData = [];
for (const employeeId of employeeIds) {
  // Convert non-integer employeeId to a valid integer (assuming SIL-0005 should be converted to 5)
  const parsedEmployeeId = isNaN(employeeId) ? parseInt(employeeId.split('-')[1]) : parseInt(employeeId); 
  const employee = await prisma.employee.findUnique({
    where: {
      EmployeeID: parsedEmployeeId,
    },
  });

  if (!employee) {
    console.error(`Employee with ID ${employeeId} not found.`);
    continue; 
  }
    const timesheets = await getEmployeeTimesheets(employee, startDate, endDate);  
    console.log(timesheets)
    const leaves = await getEmployeeLeaves(employeeId);   
    const monthWiseLeaves = getMonthWiseLeaves(leaves, startDate, endDate);
    const totalLeaves = leaves.length;
    const employeeData = {
      'Name': `${employee.FirstName} ${employee.LastName}`,
      'Month': getMonth(startDate),
    };    
    
    for (let weekNumber = 1; weekNumber <= 5; weekNumber++) {
      const weekData = getWeekData(timesheets, weekNumber,employee);
      employeeData[`Week ${weekNumber} Actual Hours`] = weekData['Actual Hours'];
      employeeData[`Week ${weekNumber} Billable Hours`] = weekData['Billable Hours'];
    }
    const totalActualHours = calculateTotalActualHours(employee, startDate, endDate,200);
    const totalBillableHours = calculateTotalBillableHours(timesheets);
    const projectIds = [...new Set(timesheets.map((timesheet) => timesheet.ProjectID))];
    const projects = await prisma.project.findMany({
      where: {
        ProjectID: {
          in: projectIds,
        },
      },
      include: {
        Client: true,
      },
    });
    const projectNamesMap = {};
projects.forEach((project) => {
  projectNamesMap[project.ProjectID] = {
    clientName: project.Client?.ClientName || 'N/A',
    projectName: project.ProjectName || 'N/A',
  };
});
         const clientNames = [];
         const projectNames = [];    
       timesheets.forEach((timesheet) => {
      const { clientName, projectName } = projectNamesMap[timesheet.ProjectID] || {};
      if (!clientNames.includes(clientName)) {
        clientNames.push(clientName);
      }
      if (!projectNames.includes(projectName)) {
        projectNames.push(projectName);
      }
    });  
    
    employeeData['Client Name'] = clientNames.join(',');
    employeeData['Project Name'] = projectNames.join(',')
    employeeData['Total Actual Hours'] = totalActualHours;
    employeeData['Total Billable Hours'] = totalBillableHours;
//     employeeData['Comments'] = `Total Leaves Taken: ${totalLeaves}`;
//     console.log(totalLeaves)
//     employeesData.push(employeeData);
//   }
//   console.log(employeesData)
//   return employeesData;
// };
const leaveComments = generateLeaveComments(monthWiseLeaves);
    employeeData['Comments'] = `Total Leaves Taken: ${totalLeaves}${leaveComments}`;
    employeesData.push(employeeData);
  }
  return employeesData;
};


const generateLeaveComments = (monthWiseLeaves) => {
  let leaveComments = '';
  for (const [month, leaves] of Object.entries(monthWiseLeaves)) {
    for (const leave of leaves) {
      leaveComments += `\n${month}: ${leave.leaveday} (${leave.from_date} to ${leave.to_date})`;
    }
  }
  return leaveComments;
};
const getEmployeeTimesheets = async (employee, startDate, endDate) => {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      EmployeeID: employee.EmployeeID,
      Date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  return timesheets;
};

const getWeekData = (timesheets, weekNumber, employee) => {
  const weekData = {
    'Week': weekNumber,
    'Actual Hours': 40,
    'Billable Hours': 0,
  };

  timesheets.forEach((timesheet) => {    
    const timesheetWeekNumber = (0 | new Date(timesheet.Date).getDate() / 7)+1;   

    if (timesheetWeekNumber === weekNumber) {
    
      weekData['Actual Hours'] = 40;
      weekData['Billable Hours'] += parseFloat(timesheet.HoursWorked) || 0;
    }
  });
 console.log(weekData)
  return weekData;
};

const calculateTotalActualHours = (employee, startDate, endDate, targetTotalHours) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));  
  const targetTotalActualHours = targetTotalHours || 200;
  const adjustedDefaultHours = targetTotalActualHours / 5; 
  const totalActualHours = adjustedDefaultHours * 5; 
  return totalActualHours;
};

const calculateTotalBillableHours = (timesheets) => {
 
  const totalBillableHours = timesheets.reduce((total, timesheet) => total + parseFloat(timesheet.HoursWorked),0)
  return totalBillableHours;
};

const getMonth = (startDate) => {
  return format(new Date(startDate), 'MMMM', { locale: enUS });
};

//* THIS COMMITTED CODE IS FOR EMPLOYEE EXCEL KINDLY DONT DELETE *//

// const exportEmployeesExcel = async (req, res) => {
//   try {
//     let { employeeId, employeeIds, startDate, endDate } = req.body;

   
//     if (!employeeIds) {
//       employeeIds = [employeeId];
//     }

//     const employeesData = await generateEmployeesExcelData(employeeIds, startDate, endDate);
//     const currentDate = new Date().toLocaleDateString('en-IN');
//     const formattedDate = currentDate.replace(/\//g, '-');
//     const fileName = `employees-report-${formattedDate}.xlsx`; 
//     const filePath = `public/${fileName}`;
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Employees');
    
//     worksheet.addRow([
//       'Name',
//       'Month',
//       'Week 1 Actual Hours',
//       'Week 1 Billable Hours',
//       'Week 2 Actual Hours',
//       'Week 2 Billable Hours',
//       'Week 3 Actual Hours',
//       'Week 3 Billable Hours',
//       'Week 4 Actual Hours',
//       'Week 4 Billable Hours',
//       'Week 5 Actual Hours',
//       'Week 5 Billable Hours',
//       'Total Actual Hours',
//       'Total Billable Hours',
//       'Comments',
//     ]);

  
//     employeesData.forEach((employeeData) => {
//       const rowData = [
//         employeeData.Name,
//         employeeData.Month,
//         ...getWeekColumns(employeeData, 'Week 1'),
//         ...getWeekColumns(employeeData, 'Week 2'),
//         ...getWeekColumns(employeeData, 'Week 3'),
//         ...getWeekColumns(employeeData, 'Week 4'),
//         ...getWeekColumns(employeeData, 'Week 5'),
//         employeeData['Total Actual Hours'],
//         employeeData['Total Billable Hours'],
//         employeeData.Comments,
//       ];
//       worksheet.addRow(rowData);
//     });

//     await workbook.xlsx.writeFile(filePath);
//     res.download(filePath, fileName);
//     res.status(200).json(employeesData);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
// const getWeekColumns = (employeeData, weekKey) => {
//   const weekData = employeeData[weekKey];
//   return [weekData ? weekData['Actual Hours'] : '', weekData ? weekData['Billable Hours'] : ''];
// };
// const generateEmployeesExcelData = async (employeeIds, startDate, endDate) => {
//   const employeesData = [];

//   for (const employeeId of employeeIds) {
//     const employeeData = await generateEmployeeExcelDatas(employeeId, startDate, endDate);
//     employeesData.push(...employeeData);
//   }

//   return employeesData;
// };

// const generateEmployeeExcelDatas = async (employeeId, startDate, endDate) => {
//   const employee = await prisma.employee.findUnique({
//     where: {
//       EmployeeID: parseInt(employeeId),
//     },
//   });

//   const totalActualHours = await calculateTotalHourss(employee, startDate, endDate, 'ActualHours');
//   const totalBillableHours = await calculateTotalHourss(employee, startDate, endDate, 'BillableHours');

//   const employeeData = {
//     'Name': `${employee.FirstName} ${employee.LastName}`,
//     'Month': getMonth(startDate),
//   };

//   for (let weekNumber = 1; weekNumber <= 5; weekNumber++) {
//     employeeData[`Week ${weekNumber}`] = await getWeekData(employee, startDate, endDate, weekNumber);
//   }

//   employeeData['Total Actual Hours'] = totalActualHours;
//   employeeData['Total Billable Hours'] = totalBillableHours;
//   employeeData['Comments'] = 'Your comments here'; 

//   console.log(employeeData);
//   return [employeeData];
// };

// const calculateTotalHourss = async (employee, startDate, endDate, field) => {
//   const timesheets = await prisma.timesheet.findMany({
//     where: {
//       EmployeeID: employee.EmployeeID,
//       Date: {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       },
//     },
//   });

//   const totalHours = timesheets.reduce((total, timesheet) => total + timesheet[field], 0);
//   return totalHours;
// };

// const getWeekData = async (employee, startDate, endDate, weekNumber) => {
//   const timesheets = await prisma.timesheet.findMany({
//     where: {
//       EmployeeID: employee.EmployeeID,
//       Date: {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       },
//     },
//   });

//   const weekData = {
//     'Actual Hours': 0,
//     'Billable Hours': 0,
//   };

//   timesheets.forEach((timesheet) => {
//     const timesheetWeekNumber = getISOWeek(timesheet.Date);

//     if (timesheetWeekNumber === weekNumber) {
//       weekData['Actual Hours'] += timesheet.ActualHours;
//       weekData['Billable Hours'] += timesheet.BillableHours;
//     }
//   });

//   return weekData;
// };

// const getMonth = (startDate) => {
//   return format(new Date(startDate), 'MMMM', { locale: enUS });
// };

// const getUserLeaves = async (employeeId) => {
//   const sql = `
//     SELECT s.employeeId, l.leavetypeid, l.leaveday, l.from_date, l.to_date
//     FROM main_employees_summary s
//     JOIN main_leaverequest l ON s.user_id = l.user_id
//     WHERE s.employeeId = ?;
//   `;

//   return new Promise((resolve, reject) => {
//     pool.query(sql, [employeeId], (error, results) => {
//       if (error) {
//         console.error('Error executing query:', error.sqlMessage);
//         return reject(error);
//       }

//       if (results.length > 0) {
//         const successMessage = 'Leaves found for the user.';
//         resolve({ successMessage, leaves: results });
//       } else {
//         const errorMessage = 'No leaves found for the user.';
//         resolve({ errorMessage, leaves: [] });
//       }
//     });
//   });
// };
module.exports = {
  // getUserLeaves,
  exportEmployeeCSVs,
  // exportEmployeesExcel,
  exportEmployeesCSV,
  exportEmployeeCSV,
  getManagerData,
  exportCSV,
  getManagers,
  getManagerProfile,
  createManagerEmployeesWithHours,  
  createManagerEmployee,
  getManagerEmployees,
};




