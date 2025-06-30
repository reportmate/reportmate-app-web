import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * API handler for Business Units management
 * 
 * GET /api/business-units - List all business units
 * POST /api/business-units - Create a new business unit
 * PUT /api/business-units/[id] - Update business unit
 * DELETE /api/business-units/[id] - Delete business unit
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getBusinessUnits(req, res);
      case 'POST':
        return await createBusinessUnit(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Business Units API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBusinessUnits(req: NextApiRequest, res: NextApiResponse) {
  const businessUnits = await prisma.businessUnit.findMany({
    include: {
      machineGroups: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              devices: true
            }
          }
        }
      },
      businessUnitUsers: true,
      businessUnitGroups: true,
      _count: {
        select: {
          machineGroups: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return res.status(200).json(businessUnits);
}

async function createBusinessUnit(req: NextApiRequest, res: NextApiResponse) {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Business unit name is required' });
  }

  // Check if business unit already exists
  const existing = await prisma.businessUnit.findUnique({
    where: { name }
  });

  if (existing) {
    return res.status(409).json({ error: 'Business unit with this name already exists' });
  }

  const businessUnit = await prisma.businessUnit.create({
    data: {
      name,
      description
    },
    include: {
      machineGroups: true,
      businessUnitUsers: true,
      businessUnitGroups: true
    }
  });

  return res.status(201).json(businessUnit);
}
