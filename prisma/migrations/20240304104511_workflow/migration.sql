-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_title` VARCHAR(191) NOT NULL,
    `business_unit` VARCHAR(191) NOT NULL,
    `job_code` VARCHAR(191) NOT NULL,
    `salary` VARCHAR(191) NULL,
    `remote_job` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `requisition_status` VARCHAR(191) NOT NULL,
    `jobtype` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `job_start_date` DATETIME(3) NULL,
    `job_end_date` DATETIME(3) NULL,
    `required_hours` DOUBLE NOT NULL,
    `priority` VARCHAR(191) NOT NULL,
    `job_exp_date` VARCHAR(191) NULL,
    `required_experience` VARCHAR(191) NOT NULL,
    `degree` VARCHAR(191) NOT NULL,
    `industry` VARCHAR(191) NOT NULL,
    `primary_skills` VARCHAR(191) NOT NULL,
    `secondary_skills` VARCHAR(191) NOT NULL,
    `no_of_positions` INTEGER NOT NULL,
    `job_description` VARCHAR(191) NOT NULL,
    `hiring_manager` VARCHAR(191) NULL,
    `recruitment_manager` VARCHAR(191) NULL,
    `tax_terms` VARCHAR(191) NULL,
    `status` BOOLEAN NULL,
    `last_updated_date` DATETIME(3) NULL,
    `last_updated_by` VARCHAR(191) NULL,
    `work_flow` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkFlowDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `work_flow_id` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `approver1` VARCHAR(191) NULL,
    `approver2` VARCHAR(191) NULL,
    `last_updated_by` VARCHAR(191) NULL,
    `last_updated_time` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkFlowApproval` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` VARCHAR(191) NULL,
    `job_code` VARCHAR(191) NULL,
    `status` BOOLEAN NULL,
    `last_updated_by` VARCHAR(191) NULL,
    `last_updated_time` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
