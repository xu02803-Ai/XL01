# AI Hub 前端集成指南

## 快速开始

所有 AI 操作现在统一通过 `/api/ai-hub` 端点，使用 `?type=xxx` 参数来指定操作类型。

## 📖 API 使用示例

### 1. 生成新闻内容

```typescript
// 调用生成新闻
const response = await fetch('/api/ai-hub?type=content');
const result = await response.json();

if (result.success) {
  const newsArray = JSON.parse(result.data);
  console.log('新闻列表:', newsArray);
  // newsArray = [
  //   { headline: "...", summary: "...", category: "..." },
  //   ...
  // ]
}
```

**完整示例（React）：**
```typescript
import { useState } from 'react';

export function NewsGenerator() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateNews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-hub?type=content');
      const result = await response.json();
      
      if (result.success) {
        const newsData = JSON.parse(result.data);
        setNews(newsData);
      }
    } catch (error) {
      console.error('生成新闻失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateNews} disabled={loading}>
        {loading ? '生成中...' : '生成今日新闻'}
      </button>
      
      {news.map((item, i) => (
        <div key={i}>
          <h3>{item.headline}</h3>
          <p>{item.summary}</p>
          <span>{item.category}</span>
        </div>
      ))}
    </div>
  );
}
```

### 2. 生成图片

```typescript
// 为新闻标题生成相关图片
const headline = '谷歌发布新的 AI 模型';
const response = await fetch(`/api/ai-hub?type=image&headline=${encodeURIComponent(headline)}`);
const result = await response.json();

if (result.success) {
  console.log('图片 URL:', result.url);
  console.log('种子:', result.seed);  // 用于调试
  
  // 在 HTML 中显示
  const img = document.createElement('img');
  img.src = result.url;
  document.body.appendChild(img);
}
```

**完整示例（React）：**
```typescript
import { useState } from 'react';

interface NewsItem {
  headline: string;
  summary: string;
  category: string;
}

export function NewsWithImages({ news }: { news: NewsItem[] }) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const generateImage = async (headline: string) => {
    const key = `img_${Math.random()}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      const response = await fetch(
        `/api/ai-hub?type=image&headline=${encodeURIComponent(headline)}`
      );
      const result = await response.json();
      
      if (result.success) {
        setImages(prev => ({ ...prev, [headline]: result.url }));
      }
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div>
      {news.map((item, i) => (
        <div key={i} style={{ marginBottom: '20px' }}>
          <h3>{item.headline}</h3>
          <p>{item.summary}</p>
          
          {images[item.headline] ? (
            <img src={images[item.headline]} alt={item.headline} style={{ maxWidth: '100%' }} />
          ) : (
            <button onClick={() => generateImage(item.headline)}>
              生成配图
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 3. 合成语音

```typescript
// 为文本生成语音
const text = '今天是个好天气，让我们一起来看看今天的新闻吧';
const voice = 'female'; // 'male' 或 'female'

const response = await fetch(
  `/api/ai-hub?type=speech&text=${encodeURIComponent(text)}&voice=${voice}`
);
const result = await response.json();

if (result.success) {
  // 播放音频
  const audio = new Audio(`data:${result.mimeType};base64,${result.data}`);
  audio.play();
}
```

**完整示例（React）：**
```typescript
import { useRef, useState } from 'react';

export function NewsWithAudio({ text }: { text: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState<'male' | 'female'>('female');

  const synthesizeSpeech = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ai-hub?type=speech&text=${encodeURIComponent(text)}&voice=${voice}`
      );
      const result = await response.json();
      
      if (result.success && audioRef.current) {
        // 创建音频 blob
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('语音合成失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p>{text}</p>
      
      <select value={voice} onChange={(e) => setVoice(e.target.value as any)}>
        <option value="male">男性声音</option>
        <option value="female">女性声音</option>
      </select>
      
      <button onClick={synthesizeSpeech} disabled={loading}>
        {loading ? '合成中...' : '朗读'}
      </button>
      
      <audio ref={audioRef} controls />
    </div>
  );
}
```

### 4. 查看模型统计

```typescript
// 获取模型统计信息
const response = await fetch('/api/ai-hub?type=stats');
const result = await response.json();

console.log('模型统计:', result.models);
console.log('总体成功率:', result.summary.overallSuccessRate);
console.log('建议操作:', result.summary.recommendedAction);
```

**完整示例（React）：**
```typescript
import { useEffect, useState } from 'react';

export function ModelStats() {
  const [stats, setStats] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/ai-hub?type=stats');
        const result = await response.json();
        setStats(result);
      } catch (error) {
        console.error('获取统计失败:', error);
      }
    };

    fetchStats();
  }, [refresh]);

  if (!stats) return <div>加载中...</div>;

  return (
    <div>
      <h2>模型统计</h2>
      <p>总体成功率: {stats.summary.overallSuccessRate}</p>
      <p>建议: {stats.summary.recommendedAction}</p>
      
      <table>
        <thead>
          <tr>
            <th>模型</th>
            <th>成功次数</th>
            <th>错误次数</th>
            <th>成功率</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {stats.models.map((model: any) => (
            <tr key={model.model}>
              <td>{model.model}</td>
              <td>{model.successCount}</td>
              <td>{model.errorCount}</td>
              <td>{model.successRate}</td>
              <td>{model.disabled ? '禁用' : '启用'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button onClick={() => setRefresh(!refresh)}>刷新</button>
      <button onClick={async () => {
        await fetch('/api/ai-hub?type=stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' })
        });
        setRefresh(!refresh);
      }}>重置统计</button>
    </div>
  );
}
```

## 🔄 迁移检查清单

### 在你的项目中搜索以下字符串并更新：

```bash
# 搜索旧的 API 调用
grep -r "fetch.*generate-content" --include="*.tsx" --include="*.ts"
grep -r "fetch.*generate-image" --include="*.tsx" --include="*.ts"
grep -r "fetch.*synthesize-speech" --include="*.tsx" --include="*.ts"
grep -r "fetch.*model-stats" --include="*.tsx" --include="*.ts"
```

### 替换模式：

| 旧 API | 新 API |
|--------|--------|
| `/api/generate-content` | `/api/ai-hub?type=content` |
| `/api/generate-image` | `/api/ai-hub?type=image` |
| `/api/synthesize-speech` | `/api/ai-hub?type=speech` |
| `/api/model-stats` | `/api/ai-hub?type=stats` |

## ⚠️ 常见错误

### 1. URL 编码问题

**错误：**
```typescript
// ❌ 特殊字符未编码
fetch(`/api/ai-hub?type=image&headline=AI突破`)
```

**正确：**
```typescript
// ✅ 使用 encodeURIComponent
fetch(`/api/ai-hub?type=image&headline=${encodeURIComponent('AI突破')}`)
```

### 2. 请求方法错误

**错误：**
```typescript
// ❌ POST 请求 content (应该是 GET)
fetch('/api/ai-hub?type=content', { method: 'POST' })
```

**正确：**
```typescript
// ✅ GET 请求
fetch('/api/ai-hub?type=content')
```

### 3. 缺少 type 参数

**错误：**
```typescript
// ❌ 没有 type 参数
fetch('/api/ai-hub')
```

**正确：**
```typescript
// ✅ 指定 type
fetch('/api/ai-hub?type=content')
```

## 🧪 测试代码

创建一个测试页面来验证所有功能：

```typescript
// test-ai-hub.ts
export async function testAIHub() {
  console.log('开始测试 AI Hub...\n');

  // 测试 1: 生成内容
  console.log('1️⃣ 测试生成内容...');
  try {
    const response = await fetch('/api/ai-hub?type=content');
    const result = await response.json();
    console.log(result.success ? '✅ 成功' : '❌ 失败');
    console.log(result);
  } catch (e) {
    console.error('❌ 错误:', e);
  }

  // 测试 2: 生成图片
  console.log('\n2️⃣ 测试生成图片...');
  try {
    const response = await fetch('/api/ai-hub?type=image&headline=AI新闻');
    const result = await response.json();
    console.log(result.success ? '✅ 成功' : '❌ 失败');
    console.log(result);
  } catch (e) {
    console.error('❌ 错误:', e);
  }

  // 测试 3: 语音合成
  console.log('\n3️⃣ 测试语音合成...');
  try {
    const response = await fetch(
      '/api/ai-hub?type=speech&text=今天天气不错&voice=female'
    );
    const result = await response.json();
    console.log(result.success ? '✅ 成功' : '❌ 失败');
    console.log(result);
  } catch (e) {
    console.error('❌ 错误:', e);
  }

  // 测试 4: 查看统计
  console.log('\n4️⃣ 测试查看统计...');
  try {
    const response = await fetch('/api/ai-hub?type=stats');
    const result = await response.json();
    console.log(result.success ? '✅ 成功' : '❌ 失败');
    console.log(result);
  } catch (e) {
    console.error('❌ 错误:', e);
  }

  console.log('\n所有测试完成！');
}

// 在浏览器控制台调用：
// testAIHub()
```

## 📚 相关文档

- [AI_HUB_MIGRATION_GUIDE.md](AI_HUB_MIGRATION_GUIDE.md) - 完整迁移指南
- [GEMINI_FALLBACK_STRATEGY.md](GEMINI_FALLBACK_STRATEGY.md) - 降级机制详情
- [api/ai-hub.ts](api/ai-hub.ts) - 源代码

## 🆘 需要帮助？

如果在迁移过程中遇到问题，请检查：

1. ✅ 是否使用了正确的参数（`?type=...`）
2. ✅ 是否使用了正确的 HTTP 方法（GET 或 POST）
3. ✅ URL 中的中文是否正确编码（使用 `encodeURIComponent`）
4. ✅ 环境变量是否配置正确（`GEMINI_API_KEY` 等）
5. ✅ 检查浏览器控制台和服务器日志中的错误信息
