import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

/**
 * API handler for Business Units management
 * 
 * GET /api/business-units - List all business units
 * POST /api/business-units - Create a new business unit
 * PUT /api/business-units/[id] - Update business unit
 * DELETE /api/business-units/[id] - Delete business unit
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Temporarily disabled during build restructure
  return res.status(503).json({ error: 'Business Units API temporarily unavailable' });
  
  /*
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
  */
}

