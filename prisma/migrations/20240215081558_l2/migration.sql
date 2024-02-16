-- AlterTable
ALTER TABLE `employee` ADD COLUMN `l2_id` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `reporting_manager_id` VARCHAR(191) NOT NULL DEFAULT '';
