/**
 * AI Hub 统一调度器 - 集成测试脚本
 * 用于验证所有 4 种操作类型是否正常工作
 * 
 * 使用: node test-ai-hub.js [BASE_URL]
 * 示例: node test-ai-hub.js http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  httpCode: number;
  response: any;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  data?: any
): Promise<void> {
  try {
    console.log(`\n🧪 测试: ${name}`);
    console.log(`   请求: ${method} ${BASE_URL}${path}`);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const responseData = await response.json();

    const passed = response.ok || response.status === 200;
    results.push({
      name,
      passed,
      httpCode: response.status,
      response: responseData,
    });

    if (passed) {
      console.log(`✅ 成功 (HTTP ${response.status})`);
      console.log(`   响应: ${JSON.stringify(responseData).substring(0, 150)}...`);
    } else {
      console.log(`❌ 失败 (HTTP ${response.status})`);
      console.log(`   响应: ${JSON.stringify(responseData)}`);
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      httpCode: 0,
      response: null,
      error: error.message,
    });
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 AI Hub 统一调度器 - 集成测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`服务器: ${BASE_URL}\n`);

  // 测试 1: 生成新闻内容
  await testEndpoint(
    '生成新闻内容',
    'GET',
    '/api/ai-hub?type=content&dateStr=2026-01-03'
  );

  // 测试 2: 生成图片提示词
  await testEndpoint(
    '生成图片提示词',
    'GET',
    '/api/ai-hub?type=image&headline=' + encodeURIComponent('AI 新突破')
  );

  // 测试 3: 语音合成 (GET)
  await testEndpoint(
    '语音合成',
    'GET',
    '/api/ai-hub?type=speech&text=' + encodeURIComponent('今日科技新闻') + '&voice=female'
  );

  // 测试 4: 获取模型统计 (GET)
  await testEndpoint(
    '获取模型统计',
    'GET',
    '/api/ai-hub?type=stats'
  );

  // 测试 5: 重置模型统计 (POST)
  await testEndpoint(
    '重置模型统计',
    'POST',
    '/api/ai-hub?type=stats',
    { action: 'reset' }
  );

  // 测试 6: 禁用模型 (POST)
  await testEndpoint(
    '禁用 gemini-2.5-flash 模型',
    'POST',
    '/api/ai-hub?type=stats',
    { action: 'disable', model: 'gemini-2.5-flash' }
  );

  // 测试 7: 启用模型 (POST)
  await testEndpoint(
    '启用 gemini-2.5-flash 模型',
    'POST',
    '/api/ai-hub?type=stats',
    { action: 'enable', model: 'gemini-2.5-flash' }
  );

  // 统计结果
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 测试结果汇总');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ 通过: ${passed}/${results.length}`);
  console.log(`❌ 失败: ${failed}/${results.length}`);

  // 详细结果
  console.log('\n📝 详细结果:');
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.name} (HTTP ${result.httpCode})`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed === 0) {
    console.log('🎉 所有测试通过！AI Hub 正常工作！');
    process.exit(0);
  } else {
    console.log('⚠️ 有些测试失败。请检查 API 实现。');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});
