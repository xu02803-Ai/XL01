#!/usr/bin/env node

/**
 * Vercel API Key 完整测试脚本
 * 用途：验证 Google API Key 和 Vercel 环境变量配置
 * 使用: node test-vercel-setup.js <API_KEY> [VERCEL_URL]
 */

const https = require('https');
const http = require('http');

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(type, message) {
  const prefix = {
    error: `${colors.red}❌${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    warning: `${colors.yellow}⚠️ ${colors.reset}`,
    info: `${colors.cyan}ℹ️ ${colors.reset}`,
    test: `${colors.blue}🧪${colors.reset}`,
    step: `${colors.cyan}→${colors.reset}`
  };
  
  console.log(`${prefix[type] || '•'} ${message}`);
}

function httpRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      method,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = protocol.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testGoogleApiKey(apiKey) {
  log('test', '测试 Google API Key 有效性');
  console.log('');
  
  if (!apiKey || apiKey.length < 30) {
    log('warning', `API Key 看起来无效 (长度: ${apiKey?.length || 0})`);
    return false;
  }
  
  try {
    log('step', '发送请求到 Google Gemini API (v1beta/models/gemini-2.0-flash)...');
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: "Respond with just the word: VALID" }]
      }],
      generationConfig: {
        maxOutputTokens: 10
      }
    };
    
    const response = await httpRequest(url, 'POST', payload);
    
    if (response.status === 200) {
      log('success', `Google API 成功响应 (Status: 200)`);
      
      try {
        const data = JSON.parse(response.body);
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          log('success', `✨ API Key 完全有效！Gemini 响应: "${text}"`);
          return true;
        }
      } catch (e) {
        log('warning', '无法解析响应 JSON，但 Status 为 200');
        return true;
      }
    } else if (response.status === 400) {
      const errMsg = response.body;
      if (errMsg.includes('API key not valid')) {
        log('error', `API Key 无效或已过期 (Status: 400)`);
        log('error', '解决方案：获取新 Key https://aistudio.google.com/app/apikey');
      } else {
        log('error', `API 返回 400 错误: ${errMsg.substring(0, 100)}`);
      }
      return false;
    } else if (response.status === 429) {
      log('warning', `收到 Rate Limit 错误 (Status: 429)，说明 Key 有效但超过配额`);
      return true; // Key 有效，只是超过限制
    } else {
      log('error', `收到 ${response.status} 错误: ${response.body.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    log('error', `请求失败: ${error.message}`);
    log('step', '可能原因:');
    log('step', '  1. 网络连接问题');
    log('step', '  2. API Key 格式错误');
    log('step', '  3. Google API 服务不可用');
    return false;
  }
}

async function testVercelDeployment(vercelUrl) {
  log('test', `测试 Vercel 部署 (${vercelUrl})`);
  console.log('');
  
  if (!vercelUrl) {
    log('warning', '未提供 Vercel URL，跳过部署测试');
    return null;
  }
  
  try {
    const normalizedUrl = vercelUrl.replace(/\/$/, '');
    const testUrl = `${normalizedUrl}/api/ai-handler?action=text&prompt=test`;
    
    log('step', `发送请求到: ${testUrl}`);
    
    const response = await httpRequest(testUrl);
    
    log('step', `收到响应 (Status: ${response.status})`);
    
    try {
      const data = JSON.parse(response.body);
      
      if (data.success) {
        log('success', '✨ Vercel 部署正常工作！');
        log('step', `模型: ${data.model}`);
        log('step', `时间戳: ${data.timestamp}`);
        return true;
      } else {
        log('error', `API 返回失败响应: ${data.error}`);
        
        if (data.debug) {
          log('warning', '调试信息:');
          
          if (data.debug.hasKey === false) {
            log('error', '❌ 环境变量 GOOGLE_AI_API_KEY 未被读到！');
            log('step', '检查清单:');
            log('step', '  1. Vercel > Settings > Environment Variables');
            log('step', '  2. 检查变量名是否是 GOOGLE_AI_API_KEY (区分大小写)');
            log('step', '  3. 确保勾选了 Production、Preview、Development');
            log('step', '  4. 点击 Redeploy (不使用缓存)');
          }
          
          if (data.debug.keyLength === 0) {
            log('warning', 'API Key 长度为 0');
          }
          
          if (data.debug.vercelEnv) {
            log('step', `Vercel 环境: ${data.debug.vercelEnv}`);
          }
          
          if (Array.isArray(data.debug.allKeyVariables)) {
            log('step', `可用的 KEY 变量: ${data.debug.allKeyVariables.join(', ') || '无'}`);
          }
        }
        
        return false;
      }
    } catch (e) {
      log('warning', `无法解析响应: ${e.message}`);
      log('step', `原始响应: ${response.body.substring(0, 200)}`);
      
      if (response.status === 404) {
        log('error', '❌ API 端点未找到 (404)，检查 vercel.json rewrites 配置');
      } else if (response.status === 500) {
        log('error', '❌ 服务器错误 (500)，查看 Vercel 部署日志');
      }
      
      return false;
    }
  } catch (error) {
    log('error', `无法连接到 Vercel 部署: ${error.message}`);
    log('step', '可能原因:');
    log('step', '  1. Vercel URL 错误');
    log('step', '  2. 网络连接问题');
    log('step', '  3. 部署尚未完成');
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}🔍 Vercel API Key 完整测试${colors.reset}\n`);
  
  const args = process.argv.slice(2);
  const apiKey = args[0];
  const vercelUrl = args[1];
  
  if (!apiKey) {
    log('error', '请提供 API Key 作为第一个参数');
    console.log(`\n使用方法:`);
    console.log(`  node test-vercel-setup.js <API_KEY> [VERCEL_URL]`);
    console.log(`\n示例:`);
    console.log(`  node test-vercel-setup.js AIzaXXXXXXXXXXXXXXXXXXXX`);
    console.log(`  node test-vercel-setup.js AIzaXXXXXXXXXXXXXXXXXXXX https://my-project.vercel.app`);
    process.exit(1);
  }
  
  console.log(`${colors.cyan}=== 第 1 步: 验证 Google API Key ===${colors.reset}\n`);
  const googleValid = await testGoogleApiKey(apiKey);
  
  console.log(`\n${colors.cyan}=== 第 2 步: 测试 Vercel 部署 ===${colors.reset}\n`);
  const vercelValid = await testVercelDeployment(vercelUrl);
  
  console.log(`\n${colors.cyan}=== 测试总结 ===${colors.reset}\n`);
  
  log('step', `Google API Key: ${googleValid ? `${colors.green}✅ 有效${colors.reset}` : `${colors.red}❌ 无效${colors.reset}`}`);
  log('step', `Vercel 部署: ${vercelValid === null ? `${colors.yellow}⏭️ 跳过${colors.reset}` : (vercelValid ? `${colors.green}✅ 工作${colors.reset}` : `${colors.red}❌ 失败${colors.reset}`)}`);
  
  console.log('');
  
  if (googleValid && (vercelValid === true || vercelUrl === undefined)) {
    log('success', '所有测试通过！您可以开始使用 API。');
    process.exit(0);
  } else if (googleValid && vercelValid === false) {
    log('warning', 'Google API Key 有效，但 Vercel 部署有问题。');
    log('step', '请检查环境变量配置并 Redeploy。');
    process.exit(1);
  } else {
    log('error', '某些测试失败。请检查错误信息。');
    process.exit(1);
  }
}

main().catch(console.error);
