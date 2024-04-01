
const { PrismaClient } = require('@prisma/client');
const timesheetModel = require('../models/timesheetModel');
const prisma = new PrismaClient();
const bodyParser = require('body-parser');
const express = require('express');
const router = require('../routes/timesheetRoutes');
const app = express();
const nodemailer = require('nodemailer');
app.use(bodyParser.json());
const moment = require('moment-timezone');



const createTimesheets = async (req, res) => {
  try {
    const timesheetEntries = req.body.timesheets;
    if (!timesheetEntries || !Array.isArray(timesheetEntries)) {
      return res.status(400).json({ error: 'Invalid timesheetEntries in the request body' });
    }
    let status = 'success';
    let message = 'All timesheets processed successfully';

    await Promise.all(timesheetEntries.map(entry => handleProjectDeletion(entry.EmployeeID, entry.entryDate)));
   
    const results = await Promise.all(
      timesheetEntries.map(async (entry) => {
        const { EmployeeID,  EmployeeCode,
          ProjectID, entryDate, Status, Description, HoursWorked, EntryType, Comment, WorkFromHome } = entry;
      
        const date = new Date(entryDate);
        date.setUTCHours(0, 0, 0, 0);

        const existingTimesheet = await prisma.timesheet.findFirst({
          where: {
            EmployeeID,
            ProjectID,
            Date: date, 
          },
        });
         
        if (existingTimesheet) {        
          const updatedTimesheet = await prisma.timesheet.update({
            where: {
              TimesheetID: existingTimesheet.TimesheetID,
            },
            data: {
              Date: date,
              Status,
              HoursWorked,
              Description,
              Comment,
              WorkFromHome,
              isActive: 1,
            },
          });
          return { data: updatedTimesheet };
        } else {         
          const newTimesheet = await prisma.timesheet.create({
            data: {
              EmployeeID,
              EmployeeCode,
              ProjectID,
              Date: date,
              Status,
              HoursWorked,
              Description,
              Comment,
              WorkFromHome,
              isActive: 1,
            },
          });
          return { status: 'success', message: 'Timesheet created successfully', data: newTimesheet };
        }
      })
    );

    res.json({ status, message, data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

const handleProjectDeletion = async (employeeId, entryDate) => {
  try {
    // Remove time zone and set to midnight
    const date = new Date(entryDate);
    date.setUTCHours(0, 0, 0, 0);

    const timesheetsToUpdate = await prisma.timesheet.findMany({
      where: {
        EmployeeID: employeeId,
        Date: date,
      },
    });
    await Promise.all(
      timesheetsToUpdate.map(async (timesheet) => {
        await prisma.timesheet.update({
          where: {
            TimesheetID: timesheet.TimesheetID,
          },
          data: {
            isActive: 0, 
          },
        });
      })
    );
    console.log(timesheetsToUpdate)
    console.log(`Updated ${timesheetsToUpdate.length} timesheets for EmployeeID ${employeeId} and entry date ${date}`);
  } catch (error) {
    console.error('Error updating timesheets:', error);
    throw error;
  }
};

const getAllTimesheetdata = async (req, res) => {
  try {
    const { EmployeeID, startDate, endDate } = req.body;
    const existingEmployee = await prisma.employee.findMany({
      where: {
        EmployeeID: EmployeeID,
      },
    });
    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const dummyTimesheet = {
      EmployeeID: EmployeeID,
      ProjectID: 1,
      Date: randomDate(new Date(startDate), new Date(endDate), 0, 0),
      Status: 'submitted',
      HoursWorked: Math.floor(Math.random() * 8) + 1,
      Description: 'Random Description',
    };
    const createdTimesheet = await prisma.timesheet.create({
      data: dummyTimesheet,
    });

    res.json({ status: 'success', message: 'Timesheet created successfully', data: dummyTimesheet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

  function randomDate(start, end, startHour, endHour) {
    var date = new Date(+start + Math.random() * (end - start));
    var hour = startHour + Math.random() * (endHour - startHour) | 0;
    date.setHours(hour);
    return date;
  }
}

const getTimesheetList = async (req, res) => {
  try {
    const timesheets = await timesheetModel.getTimesheets();
    res.json({status: 'success',data:timesheets});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTimesheetsByEmployeeAndDateRange = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;
    const timesheets = await timesheetModel.getTimesheetsByEmployeeAndDateRange(
      parseInt(employeeId),
      new Date(startDate),
      new Date(endDate)
    );
    res.json({status: 'success',data:timesheets});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTimesheetsByManagerAndDateRange = async (req, res) => {
  try {
    const { managerId, startDate, endDate } = req.body;
    const timesheets = await timesheetModel.getTimesheetsByManagerAndDateRange(
      parseInt(managerId),
      new Date(startDate),
      new Date(endDate)
    );
    res.json({status: 'success',data:timesheets});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const approveTimesheet = async (req, res) => {
  try {
    const { TimesheetIDs,employeeIds } = req.body; 

    if (!TimesheetIDs || !employeeIds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Array.isArray(TimesheetIDs)) {
      return res.status(400).json({ error: 'TimesheetIDs must be an array' });
    } 
    const updateResult = await prisma.timesheet.updateMany({
      where: {
        TimesheetID: {
          in: TimesheetIDs,
        },
        EmployeeID: {
          in: employeeIds,
        },
          },
      data: {
        Status: 'approved',
      },
    });
    console.log(updateResult)
    const updatedTimesheets = await prisma.timesheet.findMany({
      where: {
        TimesheetID: {
          in: TimesheetIDs,
        },
        EmployeeID: {
          in: employeeIds,
        },
       
        Status: 'approved',
      },
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'navathesiddhartha990@gmail.com',
        pass: 'njwt woxj xjfr oqrv',
      },
    });

    const employees = await prisma.employee.findMany({
      where: {
        EmployeeID: {
          in: employeeIds,
        },
      },
      select: {
        EmployeeID: true,
        FirstName: true,
        LastName: true,
        Email: true,
      },
    });


for (const employeeId of employeeIds) {
  const employee = await prisma.employee.findUnique({
    where: {
      EmployeeID: employeeId,
    },
    select: {
      EmployeeID: true,
      FirstName: true,
      LastName: true,
      Email: true,
    },
  });

}
console.log(updatedTimesheets)
res.json({ message: 'Timesheets approved successfully', updatedTimesheets });
} catch (error) {
console.error(error);
res.status(500).json({ error: 'Internal Server Error' });
}
};



const pendingTimesheet = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.params;

    const updatedTimesheet = await prisma.timesheet.update({
      where: {

        EmployeeID: employeeId,
        Date: {
          gte: startDate,
          lte: endDate,
        }

      },
      data: {
        Status: 'pending',
      },
    });

    res.json(updatedTimesheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const rejectTimesheet = async (req, res) => {
  try {
    const {TimesheetIDs, employeeIds,  rejectionComment } = req.body;   
     

    if (!TimesheetIDs || !employeeIds ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Array.isArray(TimesheetIDs)) {
      return res.status(400).json({ error: 'TimesheetIDs must be an array' });
    }

    // const isValidDateFormat = (dateString) => {
    //   const regex = /^\d{4}-\d{2}-\d{2}$/;
    //   return regex.test(dateString);
    // };

    // if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    //   return res.status(400).json({ error: 'Invalid date format for startDate or endDate' });
    // }

    const updateResult = await prisma.timesheet.updateMany({
      where: {
        TimesheetID: {
          in: TimesheetIDs,
        },
        EmployeeID: {
          in: employeeIds,
        },
        // Date: {
        //   gte: new Date(startDate),
        //   lte: new Date(endDate),
        // },
      },
      data: {
        Status: 'rejected',
        RejectionComment: rejectionComment, 
      },
    });
    
    const updatedTimesheets = await prisma.timesheet.findMany({
      where: {
        TimesheetID: {
          in: TimesheetIDs,
        },
        EmployeeID: {
          in: employeeIds,
        },
        // Date: {
        //   gte: new Date(startDate),
        //   lte: new Date(endDate),
        // },
        Status: 'rejected',
      },
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'navathesiddhartha990@gmail.com',
        pass: 'njwt woxj xjfr oqrv',
      },
    });

    const employees = await prisma.employee.findMany({
      where: {
        EmployeeID: {
          in: employeeIds,
        },
      },
      select: {
        EmployeeID: true,
        FirstName: true,
        LastName: true,
        Email: true,
      },
    });



for (const employeeId of employeeIds) {
  const employee = await prisma.employee.findUnique({
    where: {
      EmployeeID: employeeId,
    },
    select: {
      EmployeeID: true,
      FirstName: true,
      LastName: true,
      Email: true,
    },
  });

  const mailOptions = {
    from: 'navathesiddhartha990@gmail.com',
    to: employee.Email,
    subject: 'Timesheet Rejected',
    text: `Dear ${employee.FirstName} ${employee.LastName},\n\nYour timesheet has been rejected. Reason: ${
      rejectionComment || 'No comment provided'
    }. Please review and contact your manager for more details.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(`Error sending email to ${employee.Email}:`, error);
    } else {
      console.log(`Email sent to ${employee.Email}:`, info.response);
    }
  });
}

res.json({ message: 'Timesheets rejected successfully', updatedTimesheets });
} catch (error) {
console.error(error);
res.status(500).json({ error: 'Internal Server Error' });
}
};

const getEmployeesUnderManagerOnSameProject = async (req, res) => {
  try {
    const { managerId, projectId, clientId, startDate, endDate } = req.body;    
    const managerExists = await prisma.employee.findUnique({
      where: { EmployeeID: managerId },
    });
   
    if (!managerExists) {
      return res.status(404).json({ error: 'Manager not found' });
    }   
    
    const employeesList = await prisma.employee.findMany({
      where: {
        reporting_manager_id: managerExists.EmployeeCode, 
      },
      select: {
        EmployeeID: true,
        EmployeeCode: true,
        FirstName: true,
        LastName: true,
        Email: true,
        Timesheets: {
          where: {
            ProjectID: projectId,            
            Date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          select: {
            ProjectID: true,
            HoursWorked: true,
          },
        },
      },
    });
      
    const result = employeesList.map((employee) => {
     
      const totalHours = (employee?.Timesheets || []).reduce(
        (total, timesheet) => total + timesheet.HoursWorked,
        0
      );

      return {
        employee: {
          EmployeeID: employee.EmployeeID,
          EmployeeCode: employee.EmployeeCode,
          FirstName: employee.FirstName,
          LastName: employee.LastName,
          Email: employee.Email,
        },
        totalHours: totalHours,      
        clientId: clientId,
        projectId: projectId,
      };
    });
    
    res.json({ status: 'success',  data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const filterEmployees = async (req, res) => {
  try {
    const { managerId, clientId, projectId, startDate, endDate } = req.body;
    
    const managerExists = await prisma.employee.findUnique({
      where: { EmployeeID: managerId },
    });
  
    if (!managerExists) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    let employeesList = "";

    const whereClause = {
      reporting_manager_id: managerExists.EmployeeCode,
      Timesheets: {
        some: {
          Date: { gte: new Date(startDate) },
          Date: { lte: new Date(endDate) }
        }
      }
    };

    if (clientId !== "") {
      whereClause.Timesheets.some.AND = whereClause.Timesheets.some.AND || [];
      whereClause.Timesheets.some.AND.push({ Project: { ClientID: clientId } });
    }

    if (projectId !== "") {
      whereClause.Timesheets.some.AND = whereClause.Timesheets.some.AND || [];
      whereClause.Timesheets.some.AND.push({ ProjectID: projectId });
    }

    employeesList = await prisma.employee.findMany({
      where: whereClause,
      select: {
        EmployeeID: true,
        EmployeeCode: true,
        FirstName: true,
        LastName: true,
        Email: true,
        Timesheets: {
          where: {
            Date: { 
              gte: new Date(startDate), 
              lte: new Date(endDate) 
            },          
            ...(clientId !== "" && { Project: { ClientID: clientId } }),          
            ...(projectId !== "" && { ProjectID: projectId })
          },
          select: {
            HoursWorked: true,
            Date: true
          },
        },
      },
    });

    const result = employeesList.map((employee) => {
      // Calculate total hours for each employee within the specified month
      const totalHours = (employee?.Timesheets || []).reduce(
        (total, timesheet) => {
          const timesheetDate = new Date(timesheet.Date);
          if (timesheetDate >= new Date(startDate) && timesheetDate <= new Date(endDate)) {
            return total + timesheet.HoursWorked;
          }
          return total;
        },
        0
      );

      return {
        employee: {
          EmployeeID: employee.EmployeeID,
          EmployeeCode: employee.EmployeeCode,
          FirstName: employee.FirstName,
          LastName: employee.LastName,
          Email: employee.Email,
        },
        totalHours: totalHours,      
        clientId: clientId,
        projectId: projectId,
      };
    });

    if (!result.length) {
      return res.json({
        status: 'fail',
        message: clientId ? 'No data found for the provided Client ID' : 'No data found for the provided Project ID',
      });
    }

    res.json({ status: 'success',  data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


module.exports = {
  filterEmployees,
  getTimesheetsByManagerAndDateRange,
  getEmployeesUnderManagerOnSameProject,
  getTimesheetsByEmployeeAndDateRange,
  pendingTimesheet,
  createTimesheets,
  getTimesheetList,
  approveTimesheet,
  rejectTimesheet,
  getAllTimesheetdata,
}

