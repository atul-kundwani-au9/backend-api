/*
  Warnings:

  - Added the required column `isActive` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `employee` ADD COLUMN `isActive` INTEGER NOT NULL;
