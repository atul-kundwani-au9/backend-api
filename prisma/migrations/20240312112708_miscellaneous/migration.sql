-- CreateTable
CREATE TABLE `Miscellaneous` (
    `MiscellaneousID` INTEGER NOT NULL AUTO_INCREMENT,
    `GoogleClientID` VARCHAR(191) NOT NULL,
    `Status` BOOLEAN NOT NULL,

    PRIMARY KEY (`MiscellaneousID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
