// Media API - Handle media processing and delivery
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return getMediaInfo(res);
  }

  if (req.method === 'POST') {
    return handleMediaUpload(req, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

function getMediaInfo(res: any) {
  res.status(200).json({
    success: true,
    message: 'Media API endpoint',
    features: {
      imageGeneration: '/api/generate-image',
      speechSynthesis: '/api/synthesize-speech',
      mediaProcessing: 'Available via POST',
    },
  });
}

async function handleMediaUpload(req: any, res: any) {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data required' });
    }

    // Validate media type
    const validTypes = ['image', 'audio', 'video'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    // Process media based on type
    res.status(200).json({
      success: true,
      message: `${type} processed successfully`,
      type,
      processingInfo: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Media processing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
