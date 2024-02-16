-- AlterTable
ALTER TABLE `employee` ADD COLUMN `l2_manager` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reporting_manager` INTEGER NOT NULL DEFAULT 0;
