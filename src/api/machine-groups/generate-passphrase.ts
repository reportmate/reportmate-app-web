import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * API handler for generating machine group passphrases
 * 
 * GET /api/machine-groups/generate-passphrase - Generate a new GUID-style passphrase
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate a random GUID-style passphrase (similar to MunkiReport)
    const passphrase = crypto.randomUUID().toUpperCase();
    
    return res.status(200).json({ 
      passphrase,
      instructions: {
        client_deployment: `sudo defaults write /Library/Preferences/ReportMate Passphrase '${passphrase}'`,
        environment_variable: `CLIENT_PASSPHRASES="${passphrase}"`
      }
    });
  } catch (error) {
    console.error('Passphrase generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
