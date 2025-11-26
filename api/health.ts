export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const nodeVersion = process.version;
  
  return res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: hasApiKey,
    nodeVersion: nodeVersion,
    environment: process.env.NODE_ENV || 'production'
  });
}
