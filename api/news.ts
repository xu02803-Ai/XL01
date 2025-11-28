// News API - Get latest news from /api/generate-content
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This endpoint can be used to fetch news
    // The main news generation is handled by /api/generate-content
    res.status(200).json({
      success: true,
      message: 'Use /api/generate-content to fetch latest news',
      available_endpoints: {
        content: '/api/generate-content',
        images: '/api/generate-image',
        media: '/api/media',
      },
    });
  } catch (error: any) {
    console.error('News API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
