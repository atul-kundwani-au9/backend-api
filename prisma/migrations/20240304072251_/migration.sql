-- CreateTable
CREATE TABLE `Employee` (
    `EmployeeID` INTEGER NOT NULL AUTO_INCREMENT,
    `EmployeeCode` VARCHAR(191) NOT NULL DEFAULT '',
    `FirstName` VARCHAR(191) NOT NULL,
    `LastName` VARCHAR(191) NOT NULL DEFAULT '',
    `Email` VARCHAR(191) NOT NULL,
    `Password` VARCHAR(191) NOT NULL,
    `Admin` INTEGER NOT NULL,
    `EmployeeType` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NULL,
    `reporting_manager_name` VARCHAR(191) NOT NULL DEFAULT '',
    `l2_manager_name` VARCHAR(191) NOT NULL DEFAULT '',
    `l2_id` VARCHAR(191) NOT NULL DEFAULT '',
    `reporting_manager_id` VARCHAR(191) NOT NULL DEFAULT '',
    `reporting_manager` INTEGER NOT NULL DEFAULT 0,
    `l2_manager` INTEGER NOT NULL DEFAULT 0,
    `Version` VARCHAR(191) NOT NULL DEFAULT '',
    `DefaultHours` DOUBLE NOT NULL DEFAULT 8,
    `DefaultProject` VARCHAR(191) NOT NULL DEFAULT '',
    `DefaultClient` VARCHAR(191) NOT NULL DEFAULT '',
    `DefaultProjectId` VARCHAR(191) NOT NULL DEFAULT '',
    `concat(FirstName, ' ', LastName)` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Employee_Email_key`(`Email`),
    PRIMARY KEY (`EmployeeID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `ClientID` INTEGER NOT NULL AUTO_INCREMENT,
    `ClientName` VARCHAR(191) NOT NULL,
    `ContactPerson` VARCHAR(191) NOT NULL,
    `ContactEmail` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL,
    `client_code` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`ClientID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `ProjectID` INTEGER NOT NULL AUTO_INCREMENT,
    `ProjectName` VARCHAR(191) NOT NULL,
    `ClientID` INTEGER NOT NULL,
    `assigned_hours` INTEGER NOT NULL,

    PRIMARY KEY (`ProjectID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Timesheet` (
    `TimesheetID` INTEGER NOT NULL AUTO_INCREMENT,
    `EmployeeID` INTEGER NOT NULL,
    `ProjectID` INTEGER NOT NULL,
    `Date` DATETIME(3) NOT NULL,
    `Status` VARCHAR(191) NOT NULL,
    `HoursWorked` DOUBLE NOT NULL,
    `Description` VARCHAR(191) NOT NULL,
    `RejectionComment` VARCHAR(191) NOT NULL DEFAULT '',
    `Comment` VARCHAR(191) NOT NULL DEFAULT '',
    `WorkFromHome` INTEGER NOT NULL,
    `isActive` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`TimesheetID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManagerEmployee` (
    `managerId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,

    PRIMARY KEY (`employeeId`, `managerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Leave` (
    `LeaveID` INTEGER NOT NULL AUTO_INCREMENT,
    `EmployeeCode` VARCHAR(191) NOT NULL,
    `FirstName` VARCHAR(191) NOT NULL,
    `LastName` VARCHAR(191) NOT NULL,
    `LeaveTypeID` INTEGER NOT NULL,
    `LeaveDay` INTEGER NOT NULL,
    `FromDate` DATETIME(3) NOT NULL,
    `ToDate` DATETIME(3) NOT NULL,
    `Reason` VARCHAR(191) NOT NULL,
    `leavestatus` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`LeaveID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EmployeeProjects` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_EmployeeProjects_AB_unique`(`A`, `B`),
    INDEX `_EmployeeProjects_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_ClientID_fkey` FOREIGN KEY (`ClientID`) REFERENCES `Client`(`ClientID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timesheet` ADD CONSTRAINT `Timesheet_EmployeeID_fkey` FOREIGN KEY (`EmployeeID`) REFERENCES `Employee`(`EmployeeID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timesheet` ADD CONSTRAINT `Timesheet_ProjectID_fkey` FOREIGN KEY (`ProjectID`) REFERENCES `Project`(`ProjectID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManagerEmployee` ADD CONSTRAINT `ManagerEmployee_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `Employee`(`EmployeeID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManagerEmployee` ADD CONSTRAINT `ManagerEmployee_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`EmployeeID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EmployeeProjects` ADD CONSTRAINT `_EmployeeProjects_A_fkey` FOREIGN KEY (`A`) REFERENCES `Employee`(`EmployeeID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EmployeeProjects` ADD CONSTRAINT `_EmployeeProjects_B_fkey` FOREIGN KEY (`B`) REFERENCES `Project`(`ProjectID`) ON DELETE CASCADE ON UPDATE CASCADE;



