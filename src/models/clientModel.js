
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createClient = async (data) => {
  return prisma.client.create({
    data,
  });
};
const getClients = async () => {
  return prisma.client.findMany();
};



module.exports = {
 
  createClient,
  getClients,
};
