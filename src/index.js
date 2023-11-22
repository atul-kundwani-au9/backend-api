const express = require('express');
const employeeRoutes = require('./routes/employeeRoutes');
const projectRoutes = require('./routes/projectRoutes');
const clientRoutes = require('./routes/clientRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes')
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Use routes
app.use('/employee', employeeRoutes);
app.use('/project', projectRoutes);
app.use('/client', clientRoutes);
app.use('/timesheet', timesheetRoutes); 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


