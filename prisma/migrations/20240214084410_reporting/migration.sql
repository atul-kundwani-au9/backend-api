-- AlterTable
ALTER TABLE `employee` ADD COLUMN `l2_manager_name` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `reporting_manager_name` VARCHAR(191) NOT NULL DEFAULT '';
