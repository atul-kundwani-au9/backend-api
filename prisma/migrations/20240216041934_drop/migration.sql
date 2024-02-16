/*
  Warnings:

  - You are about to drop the column `l2_manager` on the `employee` table. All the data in the column will be lost.
  - You are about to drop the column `reporting_manager` on the `employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `employee` DROP COLUMN `l2_manager`,
    DROP COLUMN `reporting_manager`;
