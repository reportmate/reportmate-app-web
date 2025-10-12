import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

/**
 * API handler for individual Business Unit operations
 * 
 * GET /api/business-units/[id] - Get specific business unit
 * PUT /api/business-units/[id] - Update specific business unit
 * DELETE /api/business-units/[id] - Delete specific business unit
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Temporarily disabled during build restructure
  return res.status(503).json({ error: 'Business Unit API temporarily unavailable' });
  
  /*
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
  */
}

