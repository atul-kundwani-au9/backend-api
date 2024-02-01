
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
    const results = await Promise.all(
      timesheetEntries.map(async (entry) => {
        const { EmployeeID, ProjectID, entryDate, Status, Description, HoursWorked, EntryType,Comment } = entry;

        const existingEmployee = await prisma.employee.findUnique({
          where: {
            EmployeeID: EmployeeID,
          },
        });

        if (!existingEmployee) {
          return { error: `Employee with ID ${EmployeeID} not found` };
        }
        // const date = new Date(entryDate);
        const date = moment(entryDate).toDate()
        date.setHours(0, 0, 0, 0);
       
        const timesheetData = {
          EmployeeID,
          ProjectID,
          Date: date,
          Status,
          HoursWorked,
          Description,
          Comment: Comment,
          
        };
        console.log(timesheetData)
        const timesheet = await timesheetModel.createTimesheet(timesheetData);
        // if (Comment) {
        //   await timesheetModel.updateTimesheet(timesheet.id, { Comment });
        //   timesheet.Comment = Comment; 
        // }
       
        return { status: 'success', message: 'Timesheet created successfully', data: timesheet };
      })
    );

    res.json(results.filter(result => result && result.status === 'success'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
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
    res.json({status: 'success',data:timesheets});;
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
    res.json({status: 'success',data:timesheets});;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const approveTimesheet = async (req, res) => {
  try {
    const { employeeIds, startDate, endDate } = req.body;

    const isValidDateFormat = (dateString) => {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      return regex.test(dateString);
    };

    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return res.status(400).json({ error: 'Invalid date format for startDate or endDate' });
    }

    const updateResult = await prisma.timesheet.updateMany({
      where: {
        EmployeeID: {
          in: employeeIds,
        },
        Date: {
          gte: new Date(startDate),
          lte: new Date(new Date(endDate).setHours(23,59,59,59)),
        },
      },
      data: {
        Status: 'approved',
      },

    });
    console.log(updateResult)
    const updatedTimesheets = await prisma.timesheet.findMany({
      where: {
        EmployeeID: {
          in: employeeIds,
        },
        Date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
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
    const { employeeIds, startDate, endDate, rejectionComment } = req.body;

    const isValidDateFormat = (dateString) => {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      return regex.test(dateString);
    };

    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return res.status(400).json({ error: 'Invalid date format for startDate or endDate' });
    }

    const updateResult = await prisma.timesheet.updateMany({
      where: {
        EmployeeID: {
          in: employeeIds,
        },
        Date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      data: {
        Status: 'rejected',
        RejectionComment: rejectionComment, 
      },
    });
    

    const updatedTimesheets = await prisma.timesheet.findMany({
      where: {
        EmployeeID: {
          in: employeeIds,
        },
        Date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
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
    const { managerId, projectId, startDate, endDate, clientId } = req.body;

    const managerExists = await prisma.employee.findUnique({
      where: { EmployeeID: managerId },
    });

    if (!managerExists) {
      return res.status(404).json({ error: 'Manager not found' });
    }
    const employeesList = await prisma.managerEmployee.findMany({
      where: {
        managerId: managerId,
      },
      include: {
        manager: true,
        employee: {
          include: {
            Timesheets: {
              where: {
                ProjectID: projectId,
                Date: {
                  gte: new Date(startDate),
                  lte: new Date(endDate),
                },
              },
            },
          },
        },
      },
    });

    const result = employeesList.map((relation) => {
      const totalHours = (relation.employee?.Timesheets || []).reduce(
        (total, timesheet) => total + timesheet.HoursWorked,
        0
      );

      return {
        status: 'success',
        manager: relation.manager,
        employee: relation.employee,
        totalHours: totalHours,
        clientId: clientId,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
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

