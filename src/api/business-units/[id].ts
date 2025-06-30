import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * API handler for individual Business Unit operations
 * 
 * GET /api/business-units/[id] - Get specific business unit
 * PUT /api/business-units/[id] - Update specific business unit
 * DELETE /api/business-units/[id] - Delete specific business unit
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const businessUnitId = parseInt(id as string);

  if (isNaN(businessUnitId)) {
    return res.status(400).json({ error: 'Invalid business unit ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getBusinessUnit(businessUnitId, res);
      case 'PUT':
        return await updateBusinessUnit(businessUnitId, req, res);
      case 'DELETE':
        return await deleteBusinessUnit(businessUnitId, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Business Unit API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getBusinessUnit(id: number, res: NextApiResponse) {
  const businessUnit = await prisma.businessUnit.findUnique({
    where: { id },
    include: {
      machineGroups: {
        include: {
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
    }
  });

  if (!businessUnit) {
    return res.status(404).json({ error: 'Business unit not found' });
  }

  return res.status(200).json(businessUnit);
}

async function updateBusinessUnit(id: number, req: NextApiRequest, res: NextApiResponse) {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Business unit name is required' });
  }

  // Check if business unit exists
  const existing = await prisma.businessUnit.findUnique({
    where: { id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Business unit not found' });
  }

  // Check if another business unit has the same name
  const nameConflict = await prisma.businessUnit.findFirst({
    where: {
      name,
      id: { not: id }
    }
  });

  if (nameConflict) {
    return res.status(409).json({ error: 'Business unit with this name already exists' });
  }

  const businessUnit = await prisma.businessUnit.update({
    where: { id },
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

  return res.status(200).json(businessUnit);
}

async function deleteBusinessUnit(id: number, res: NextApiResponse) {
  // Check if business unit exists
  const existing = await prisma.businessUnit.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          machineGroups: true
        }
      }
    }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Business unit not found' });
  }

  // Check if business unit has machine groups
  if (existing._count.machineGroups > 0) {
    return res.status(409).json({ 
      error: 'Cannot delete business unit with associated machine groups. Remove machine groups first.' 
    });
  }

  await prisma.businessUnit.delete({
    where: { id }
  });

  return res.status(204).end();
}
