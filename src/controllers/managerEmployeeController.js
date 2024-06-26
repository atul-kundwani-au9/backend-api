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

    // const managerEmployees = await prisma.managerEmployee.findMany({
    //   where: {
    //     managerId: parseInt(managerId),
    //   },
    //   include: {
    //     manager: true,
    //     employee: true,
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

    const managerEmployeesWithHours = await Promise.all(employees1.map(async (relation) => {
    const emps = Array.isArray(managerEmployees) ? managerEmployees : [managerEmployees];

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
    // Retrieve projects and clients
    const projects = await prisma.project.findMany({
     
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
    });

    // Extract unique clients from projects
    const clientSet = new Set();
    const clientList = [];
    projects.forEach((project) => {
      const clientId = project.Client.ClientID;
      if (!clientSet.has(clientId)) {
        clientSet.add(clientId);
        clientList.push({
          ClientID: clientId,
          ClientName: project.Client.ClientName,
        });
      }
    });

    // Create project list from projects
    const projectList = projects.map((project) => ({
      ProjectID: project.ProjectID,
      ProjectName: project.ProjectName,
      ClientID: project.Client.ClientID,
    }));

    res.json({
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
// const exportEmployeeCSVs = async (req, res) => {
//   try {
//     const { employeeId, startDate, endDate } = req.body;
//     const employeeData = await generateEmployeeCSVDatas(employeeId, startDate, endDate);
//     const currentDate = new Date().toLocaleDateString('en-IN');
//     const formattedDate = currentDate.replace(/\//g, '-');
//     const fileName = `employee-report-${formattedDate}.csv`;
//     const filePath = `public/${fileName}`;
    
//     const csvWriter = createCsvWriter({
//       path: filePath,
//       header: [
//         { id: 'Name', title: 'Name' },
//         { id: 'Client', title: 'Client' }, 
//         { id: 'Project', title: 'Project' }, 
//         { id: 'Month', title: 'Month' },
//         { id: 'Week 1', title: 'Week 1' },
//         { id: 'Week 2', title: 'Week 2' },
//         { id: 'Week 3', title: 'Week 3' },
//         { id: 'Week 4', title: 'Week 4' },
//         { id: 'Week 5', title: 'Week 5' },
//         { id: 'Total Actual Hours', title: 'Total Actual Hours' },
//         { id: 'Total Billable Hours', title: 'Total Billable Hours' },
//         { id: 'Comments', title: 'Comments' },
//       ],
//     });
//     await csvWriter.writeRecords(employeeData);    
//     res.download(filePath, fileName);
//     res.status(200).json(employeeData);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
// const getEmployeeLeaves = async (employeeId) => {
//   try {
//     const response = await axios.get(`http://localhost:4000/auth/user-leaves/${employeeId}`);
//     return response.data.leaves; 
//   } catch (error) {
//     console.error(`Error fetching leaves for employee ${employeeId}:`, error);
//     return [];
//   }
// };

// const getMonthWiseLeaves = (leaves, startDate, endDate) => {
//   const monthWiseLeaves = {};
//   const start = new Date(startDate);
//   const end = new Date(endDate);  
//   leaves.forEach((leave) => {
//     const leaveDate = new Date(leave.from_date);
    
//     // Check if the leave is within the specified date range
//     if (leaveDate >= start && leaveDate <= end) {
//       const month = format(leaveDate, 'MMMM', { locale: enUS });

//       if (!monthWiseLeaves[month]) {
//         monthWiseLeaves[month] = [];
//       }

//       monthWiseLeaves[month].push({
//         leaveday: leave.leaveday,
//         from_date: leave.from_date,
//         to_date: leave.to_date,
//       });
//     }
//   });

//   return monthWiseLeaves;
// };
// const generateEmployeeCSVDatas = async (employeeIds, startDate, endDate) => {
//   if (!Array.isArray(employeeIds)) {
//     employeeIds = [employeeIds];
//   }
 
//   const employeesData = [];
// for (const employeeId of employeeIds) {
//   // Convert non-integer employeeId to a valid integer (assuming SIL-0005 should be converted to 5)
//   const parsedEmployeeId = isNaN(employeeId) ? parseInt(employeeId.split('-')[1]) : parseInt(employeeId); 
//   const employee = await prisma.employee.findUnique({
//     where: {
//       EmployeeID: parsedEmployeeId,
//     },
//   });

//   if (!employee) {
//     console.error(`Employee with ID ${employeeId} not found.`);
//     continue; 
//   }
//     const timesheets = await getEmployeeTimesheets(employee, startDate, endDate);  
//     console.log(timesheets)
//     const leaves = await getEmployeeLeaves(employeeId);   
//     const monthWiseLeaves = getMonthWiseLeaves(leaves, startDate, endDate);
//     const totalLeaves = leaves.length;
//     const employeeData = {
//       'Name': `${employee.FirstName} ${employee.LastName}`,
//       'Month': getMonth(startDate),
//     };    
    
//     for (let weekNumber = 1; weekNumber <= 5; weekNumber++) {
//       const weekData = getWeekData(timesheets, weekNumber,employee);
//       employeeData[`Week ${weekNumber} Actual Hours`] = weekData['Actual Hours'];
//       employeeData[`Week ${weekNumber} Billable Hours`] = weekData['Billable Hours'];
//     }

//     const totalActualHours = calculateTotalActualHours(employee, startDate, endDate,200);
//     const totalBillableHours = calculateTotalBillableHours(timesheets);
//     const projectIds = [...new Set(timesheets.map((timesheet) => timesheet.ProjectID))];
//     const projects = await prisma.project.findMany({
//       where: {
//         ProjectID: {
//           in: projectIds,
//         },
//       },
//       include: {
//         Client: true,
//       },
//     });
//     const projectNamesMap = {};
// projects.forEach((project) => {
//   projectNamesMap[project.ProjectID] = {
//     clientName: project.Client?.ClientName || 'N/A',
//     projectName: project.ProjectName || 'N/A',
//   };
// });
//          const clientNames = [];
//          const projectNames = [];    
//        timesheets.forEach((timesheet) => {
//       const { clientName, projectName } = projectNamesMap[timesheet.ProjectID] || {};
//       if (!clientNames.includes(clientName)) {
//         clientNames.push(clientName);
//       }
//       if (!projectNames.includes(projectName)) {
//         projectNames.push(projectName);
//       }
//     });  
    
//     employeeData['Client Name'] = clientNames.join(',');
//     employeeData['Project Name'] = projectNames.join(',')
//     employeeData['Total Actual Hours'] = totalActualHours;
//     employeeData['Total Billable Hours'] = totalBillableHours;
// //     employeeData['Comments'] = `Total Leaves Taken: ${totalLeaves}`;
// //     console.log(totalLeaves)
// //     employeesData.push(employeeData);
// //   }
// //   console.log(employeesData)
// //   return employeesData;
// // };
// const leaveComments = generateLeaveComments(monthWiseLeaves);
//     employeeData['Comments'] = `Total Leaves Taken: ${totalLeaves}${leaveComments}`;
//     employeesData.push(employeeData);
//   }
//   return employeesData;
// };


// const generateLeaveComments = (monthWiseLeaves) => {
//   let leaveComments = '';
//   for (const [month, leaves] of Object.entries(monthWiseLeaves)) {
//     for (const leave of leaves) {
//       leaveComments += `\n${month}: ${leave.leaveday} (${leave.from_date} to ${leave.to_date})`;
//     }
//   }
//   return leaveComments;
// };
// const getEmployeeTimesheets = async (employee, startDate, endDate) => {
//   const timesheets = await prisma.timesheet.findMany({
//     where: {
//       EmployeeID: employee.EmployeeID,
//       Date: {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       },
//     },
//   });

//   return timesheets;
// };

// const getWeekData = (timesheets, weekNumber, employee) => {
//   const weekData = {
//     'Week': weekNumber,
//     'Actual Hours': 40,
//     'Billable Hours': 0,
//   };

//   timesheets.forEach((timesheet) => {    
//     const timesheetWeekNumber = (0 | new Date(timesheet.Date).getDate() / 7)+1;   
//   // timesheets.forEach((timesheet) => {    
//   //   const timesheetWeekNumber = getISOWeekNumber(new Date(timesheet.Date));   
//     if (timesheetWeekNumber === weekNumber) {    
//       weekData['Actual Hours'] = 40;
//       weekData['Billable Hours'] += parseFloat(timesheet.HoursWorked) || 0;
//     }
//   });
//  console.log(weekData)
//   return weekData;
// };
// // const getISOWeekNumber = (date) => {
// //   const startOfYear = startOfISOWeek(new Date(date.getFullYear(), 0, 1));
// //   const diffInDays = differenceInDays(date, startOfYear);
// //   return Math.floor(diffInDays / 7) + 1;
// // };

// const calculateTotalActualHours = (employee, startDate, endDate, targetTotalHours) => {
//   const start = new Date(startDate);
//   const end = new Date(endDate);
//   const daysDifference = Math.ceil((end - start) / (1000 * 60 * 60 * 24));  
//   const targetTotalActualHours = targetTotalHours || 200;
//   const adjustedDefaultHours = targetTotalActualHours / 5; 
//   const totalActualHours = adjustedDefaultHours * 5; 
//   return totalActualHours;
// };

// const calculateTotalBillableHours = (timesheets) => { 
//   const totalBillableHours = timesheets.reduce((total, timesheet) => total + parseFloat(timesheet.HoursWorked),0)
//   return totalBillableHours;
// };

// const getMonth = (startDate) => {
//   return format(new Date(startDate), 'MMMM', { locale: enUS });
// };

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


const getClientListWithProjects = async (req, res) => {
  try {
    
    const projects = await prisma.project.findMany({
      include: {
        Client: true,
      },
    });
   
    const clientProjectsMap = {};
    projects.forEach((project) => {
      const { ClientID, ClientName } = project.Client;
      if (!clientProjectsMap[ClientID]) {
        clientProjectsMap[ClientID] = {
          ClientID,
          ClientName,
          Projects: [],
        };
      }
      clientProjectsMap[ClientID].Projects.push({
        ProjectID: project.ProjectID,
        ProjectName: project.ProjectName,
      });
    });

   
    const clientListWithProjects = Object.values(clientProjectsMap);

    res.json({
      clientList: clientListWithProjects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



// const generateEmployeeReport = async (req, res) => {
//   try {
//     const { clientId, startDate, endDate } = req.body;
//     const projectList = await getEmployeesUnderClient(clientId);   
//     console.log(projectList);  
    




    
//     // const reports = await Promise.all(employeesUnderClient.map(async (employee) => {
//     //   return await generateEmployeeReportData(employee.EmployeeID, startDate, endDate);
//     // }));
  
//     res.status(200).json(reports.flat());
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// const getEmployeesUnderClient = async (clientId) => {  
//   const project = await prisma.project.findMany({
//     where: {
//       ClientID: clientId
//     }
//   });
 
//   return project;
// };


const generateEmployeeReport = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.body;  

    const projectList = await getProjectsUnderClient(clientId); 
     
    if (projectList.length === 0) {
      return res.status(404).json({ message: 'No data available for the provided client ID.' });
    }
      
    const employeesReport = [];  

    for (const project of projectList) {
      const timesheets = await getProjectTimesheets(project.ProjectID, startDate, endDate, clientId);
      const assignedHoursPerDay = project.assigned_hours;
      for (const timesheet of timesheets) {
        const employee = await prisma.employee.findUnique({
          where: {
            EmployeeID: timesheet.EmployeeID,
          },
        });
        
        const projectName = timesheet.Project.ProjectName;

        let assignedHours = project.assigned_hours;
       
        const startDayOfWeek = new Date(startDate).getDay(); 
        let daysInFirstWeek = calculateWorkingDaysInFirstWeek(new Date(startDate), startDayOfWeek, assignedHoursPerDay);
        assignedHours = assignedHoursPerDay * daysInFirstWeek;
      
        const calculateActualHours = (date, assignedHours) => {
          const dayOfWeek = date.getDay();          
          switch (dayOfWeek) {
            case 0: // Sunday
            case 6: // Saturday
              return 0; 
            default: // Weekdays
              return assignedHours;
          }
        };

        console.log(assignedHours)
        const actualHours = calculateActualHours(timesheet.Date, assignedHours);        
        console.log(actualHours)
     
        const weekNumber = getWeekNumberMondayToSunday(timesheet.Date);
        const billableHours = parseFloat(timesheet.HoursWorked) || 0;
        console.log(billableHours)
        let employeeReport = employeesReport.find(report => report.name === `${employee.FirstName} ${employee.LastName}` && report.projectname === projectName);
        
        if (!employeeReport) {
          employeeReport = {
              'name': `${employee.FirstName} ${employee.LastName}`,
              'projectname': projectName,
              'totalactualhours': 0,
              'totalbillablehours': 0,
              'leaves': '',
              'holidays': '',
              'compoffdetails': '',
              'comments': {
                  'week1': [],
                  'week2': [],
                  'week3': [],
                  'week4': [],
                  'week5': []
              },
              'weeks': {
                  'week1': { 'actual': actualHours, 'billable': 0 },
                  'week2': { 'actual': project.week2_hours || assignedHoursPerDay * 5, 'billable': 0 }, 
                  'week3': { 'actual': project.week3_hours || assignedHoursPerDay * 5, 'billable': 0 }, 
                  'week4': { 'actual': project.week4_hours || assignedHoursPerDay * 5, 'billable': 0 }, 
                  'week5': { 'actual': project.week5_hours || assignedHoursPerDay * 5, 'billable': 0 }  
              }
          };
          
          employeesReport.push(employeeReport);
        }
        const comment = timesheet.Comment || '';
        const date = timesheet.Date;
        
        if (weekNumber >= 1 && weekNumber <= 5) {
            // Check if the comment exists before adding the date
            if (comment !== '') {
                employeeReport.comments[`week${weekNumber}`].push({ date, comment });
            }
        }

        // Update comment based on hours worked
        // if (timesheet.HoursWorked === 0) {
        //   const formattedDate = timesheet.Date.toISOString().split('T')[0]; 
        //   employeeReport.comments[`week${weekNumber}`].push({ date: formattedDate, comment: timesheet.Description || 'No description provided' });
        // }
        // if (timesheet.HoursWorked === 0) {
        //   const weekIndex = `week${weekNumber}`;
        //   const commentDate = timesheet.Date; 
        //   const comment = timesheet.Description || ''; 
          
        //   employeeReport.comments[weekIndex].push({ date: commentDate, Comment: comment });
        // }
 console.log(timesheet)
        // Update week-wise billable hours
        if (!employeeReport.weeks[`week${weekNumber}`]) {
          employeeReport.weeks[`week${weekNumber}`] = { 'actual': actualHours, 'billable': 0 };
        }
        employeeReport.weeks[`week${weekNumber}`].billable += billableHours;
        employeeReport.totalbillablehours += billableHours;
      }
    }

    // Response
    res.json({
      employeesReport: employeesReport.map(employee => {     
        let totalAssignedHours = 0;
        for (const weekData of Object.values(employee.weeks)) {
          totalAssignedHours += weekData.actual;
        }    
        return {
          name: employee.name,
          projectname: employee.projectname,
          ...employee.weeks,
          totalassignedhours: totalAssignedHours, 
          totalbillablehours: employee.totalbillablehours,
          leaves: employee.leaves,
          holidays: employee.holidays,
          compoffdetails: employee.compoffdetails,
          comments: employee.comments,
          Description: employee.Description
        };
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No data' });
  }
};

const calculateWorkingDaysInFirstWeek = (startDate, startDayOfWeek, assignedHoursPerDay) => {
  let count = 0;
  for (let i = startDayOfWeek; i <= 5; i++) {
    if (i === 0 || i === 6) { 
      continue;
    }
    count++;
  }
  return count;
};


// const calculateWorkingDaysInWeek = (startDate, endDate) => {
//   let count = 0;
//   for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
//     const dayOfWeek = date.getDay();
//     if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday and Saturday
//       count++;
//     }
//   }
//   return count;
// };

const calculateWorkingDaysInWeek = (startDate, endDate) => {
  let count = 0;
  const startDay = startDate.getDay(); 

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    // Exclude Sunday and Saturday, unless it's the first week and the month starts from Friday
    if ((dayOfWeek !== 0 && dayOfWeek !== 6) || (count === 0 && startDay === 5)) {
      count++;
    }
  }
  // console.log(count)
  return count  ;
};


const getProjectsUnderClient = async (clientId) => {  
  const projects = await prisma.project.findMany({
    where: {
      ClientID: clientId
    }
  });
  return projects;
};
const getProjectTimesheets = async (projectId, startDate, endDate, clientId) => {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      ProjectID: projectId,
      Date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      Project: {
        ClientID: clientId
      },
    },  
       include: {
        Project: {
          select: {
            ProjectName: true,
          },
        },
      },  
  });
  return timesheets;
};


const generateEmployeeReportData = async (employeeIds, startDate, endDate) => {
  if (!Array.isArray(employeeIds)) {
    employeeIds = [employeeIds];
  }

  const employeesReport = [];  
  for (const employeeId of employeeIds) {
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

    const timesheets = await getEmployeeTimesheet(employee, startDate, endDate);  
    console.log(timesheets);   

    const employeeReport = {
      'name': `${employee.FirstName} ${employee.LastName}`,
      'projects': [],
      'totalactualhours': 0,
      'totalbillablehours': 0,
      'leaves': '',
      'holidays': '',
      'compoffdetails': '',
      'comment': '',
      'Description':""
    };    

    // Add project-wise dat
    const projectsMap = new Map();
    timesheets.forEach(timesheet => {
        const projectName = timesheet.Project.ProjectName ;
        if (!projectsMap.has(projectName)) {
            projectsMap.set(projectName, {
                'week1': { 'assigned_hours': 40, 'billable': 0 },
                'week2': { 'assigned_hours': 40, 'billable': 0 },
                'week3': { 'assigned_hours': 40, 'billable': 0 },
                'week4': { 'assigned_hours': 40, 'billable': 0 },
                'week5': { 'assigned_hours': 40, 'billable': 0 }
            });
        }
    });
    
    // Initialize weeklyBillableHours with 0 billable hours for weeks 1 to 5
    const weeklyBillableHours = {
        'week1': 0,
        'week2': 0,
        'week3': 0,
        'week4': 0,
        'week5': 0
    };
    
    timesheets.forEach(timesheet => {      
        const projectName = timesheet.Project.ProjectName;
        const date = new Date(timesheet.Date);
        let weekNumber = getWeekNumberMondayToSunday(date);
      
        weekNumber = Math.min(Math.max(weekNumber, 1), 5);
        const billableHours = parseFloat(timesheet.HoursWorked) || 0;   
       
        projectsMap.get(projectName)[`week${weekNumber}`]['billable'] += billableHours;
       weeklyBillableHours[`week${weekNumber}`] += billableHours;
    });
    
    for (const [projectName, weekData] of projectsMap) {    
      let totalAssignedHours = 0;  
      // Calculate the total assigned hours for each week
      for (const weekNumber in weekData) {
        totalAssignedHours += weekData[weekNumber].assigned_hours;
      }
    
      const projectReport = {
        'name': employeeReport.name,
        'projectname': projectName,
        ...weekData,
        'totalassignedhours': totalAssignedHours, 
        'totalbillablehours': calculateTotalBillableHour(weekData),
        'leaves': '',
        'holidays': '',
        'compoffdetails': '',
        'comment': "",
        'Description': ""
      };
    
      employeesReport.push(projectReport);
    }    
  }
 
  return employeesReport;
};

function getWeekNumberMondayToSunday(dateString) {
  const date = new Date(dateString);  
  const dayOfMonth = date.getDate();
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfMonth = firstOfMonth.getDay();
  let weekNumber = Math.ceil((dayOfMonth + firstDayOfMonth - 1) / 7); 
  weekNumber = Math.min(weekNumber, 5);
  return weekNumber;
}

const calculateTotalBillableHour = (weekData) => {
  let totalBillableHours = 0;
  for (const weekNumber in weekData) {
    totalBillableHours += weekData[weekNumber].billable;
  }
  // console.log(weekData)
  return totalBillableHours;
};

const getWeekNumber = (date) => {
  return Math.ceil(date.getDate() / 7);
};

const getEmployeeTimesheet = async (employee, startDate, endDate) => {
  const timesheets = await prisma.timesheet.findMany({
    where: {
      EmployeeID: employee.EmployeeID,
      Date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      Project: {
        select: {
          ProjectName: true,
        },
      },
    },
  });

  return timesheets;
};



const getMonthWiseLeave = (leaves, startDate, endDate) => {
  const monthWiseLeaves = {};
  const start = new Date(startDate);
  const end = new Date(endDate);  
  leaves.forEach((leave) => {
    const leaveDate = new Date(leave.from_date);
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
  console.log(monthWiseLeaves);
  return monthWiseLeaves;
};

const getWeekDatas = (timesheets, weekNumber) => {
  const weekData = {
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

  return weekData;
};

const generateLeaveComment= (monthWiseLeaves) => {
  let leaveComments = '';
  // for (const [month, leaves] of Object.entries(monthWiseLeaves)) {
  //   for (const leave of leaves) {
  //     leaveComments += `\n${month}: ${leave.leaveday} (${leave.from_date} to ${leave.to_date})`;
  //   }
  // }
  return leaveComments;
};



const clientEmployee = async (req, res) => {
  try {
    const { clientId } = req.body;
   
    const projects = await prisma.project.findMany({
      where: {
        ClientID: clientId,
      },
    });   
    const projectIds = projects.map(project => project.ProjectID.toString());     
    const employees = await prisma.employee.findMany({
      where: {
        DefaultProjectId: {
          in: projectIds,
        },
      },
      select: {
        FirstName: true,
        LastName: true,
        Email: true,
      },
    });

    res.json({ status: 'success', data: employees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  clientEmployee,
  generateEmployeeReport,
  getClientListWithProjects,
  // getUserLeaves,
  // exportEmployeeCSVs,
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


















