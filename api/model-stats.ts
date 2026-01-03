import { getModelStats, resetModelStats, disableModel, enableModel } from "./gemini-utils";

/**
 * Monitor Gemini API model status and fallback statistics
 * Provides visibility into which models are working and error rates
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get current model statistics
      const stats = getModelStats();
      
      console.log('📊 Model Statistics:');
      stats.forEach(s => {
        console.log(`  ${s.model}:`);
        console.log(`    Success Rate: ${s.successRate}`);
        console.log(`    Success Count: ${s.successCount}`);
        console.log(`    Error Count: ${s.errorCount}`);
        if (s.lastError) {
          console.log(`    Last Error: ${s.lastError}`);
          console.log(`    Last Error Time: ${s.lastErrorTime}`);
        }
        console.log(`    Status: ${s.disabled ? '🔴 DISABLED' : '🟢 ACTIVE'}`);
      });

      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        models: stats,
        summary: {
          totalRequests: stats.reduce((sum, s) => sum + s.successCount + s.errorCount, 0),
          totalSuccesses: stats.reduce((sum, s) => sum + s.successCount, 0),
          totalErrors: stats.reduce((sum, s) => sum + s.errorCount, 0),
          overallSuccessRate: 
            stats.reduce((sum, s) => sum + s.successCount + s.errorCount, 0) > 0
              ? (
                  (stats.reduce((sum, s) => sum + s.successCount, 0) / 
                   stats.reduce((sum, s) => sum + s.successCount + s.errorCount, 0)) * 100
                ).toFixed(2) + '%'
              : 'N/A',
          recommendedAction: 
            stats.filter(s => s.successCount > 0).length === 0 
              ? '⚠️ All models experiencing issues - check API keys and quotas'
              : stats[0]?.successRate === '100.00%'
              ? '✅ Primary model functioning normally'
              : '🔄 Using fallback models - primary model has issues'
        }
      });
    }

    if (req.method === 'POST') {
      const { action, model } = req.body;

      if (action === 'reset') {
        resetModelStats();
        console.log('🔄 Model statistics reset');
        return res.status(200).json({
          success: true,
          message: 'Model statistics have been reset'
        });
      }

      if (action === 'disable' && model) {
        disableModel(model);
        return res.status(200).json({
          success: true,
          message: `Model ${model} has been disabled`,
          models: getModelStats()
        });
      }

      if (action === 'enable' && model) {
        enableModel(model);
        return res.status(200).json({
          success: true,
          message: `Model ${model} has been enabled`,
          models: getModelStats()
        });
      }

      return res.status(400).json({
        error: 'Invalid action. Use: reset, disable (with model parameter), or enable (with model parameter)'
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('❌ Model stats endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
