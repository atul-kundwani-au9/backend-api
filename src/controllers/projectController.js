
const projectModel = require('../models/projectModel');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createProject = async (req, res) => {
  try {
    const { ProjectName, ClientID } = req.body;
    const project = await projectModel.createProject({
      ProjectName,
      ClientID,
    });
   
    res.json({ status: 'success', message: 'Project created successfully', data: project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getProjectList = async (req, res) => {
  try {
    const projects = await projectModel.getProjects();
    
    
    res.json({ status: 'success', message: 'Projects retrieved successfully', data: projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const associateProjectsToEmployee = async (req, res) => {
  try {
    const { employeeId, projectIds } = req.body;
  
    await projectModel.associateProjectsToEmployee(employeeId, projectIds);
    res.json({ 
      status: 'success', 
      message: 'Projects associated with employee successfully',
      data: {
        employeeId,
        projectIds
      }
    });
  } catch (error) {
    console.error('Error associating projects with employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { 
  associateProjectsToEmployee,
  createProject,
  getProjectList,
};
