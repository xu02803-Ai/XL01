#!/bin/bash

echo "🔍 Diagnosing 'JSON parsing' error issue..."
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking API Handler File${NC}"
if [ -f "api/ai-handler.ts" ]; then
  echo -e "${GREEN}✅ /api/ai-handler.ts exists${NC}"
else
  echo -e "${RED}❌ /api/ai-handler.ts NOT FOUND${NC}"
  echo "   This is the root cause of the JSON error!"
fi
echo ""

echo -e "${YELLOW}2. Checking Environment Variables${NC}"
if [ -z "$GOOGLE_AI_API_KEY" ]; then
  echo -e "${RED}❌ GOOGLE_AI_API_KEY is NOT SET${NC}"
  echo "   Solution: Set this in Vercel Environment Variables or .env"
  echo "   Get key from: https://aistudio.google.com/app/apikey"
else
  echo -e "${GREEN}✅ GOOGLE_AI_API_KEY is configured${NC}"
fi
echo ""

echo -e "${YELLOW}3. Checking Package Dependencies${NC}"
if grep -q "@google/generative-ai" package.json; then
  echo -e "${GREEN}✅ @google/generative-ai is in dependencies${NC}"
else
  echo -e "${RED}❌ @google/generative-ai NOT in dependencies${NC}"
  echo "   Run: npm install @google/generative-ai"
fi
echo ""

echo -e "${YELLOW}4. TypeScript Configuration${NC}"
if grep -q '"module": "ES' tsconfig.json; then
  echo -e "${GREEN}✅ TypeScript using ES modules${NC}"
else
  echo -e "${YELLOW}⚠️  Check tsconfig.json for module settings${NC}"
fi
echo ""

echo -e "${YELLOW}5. Frontend Build Tests${NC}"
cd "每日科技脉搏 app" 2>/dev/null
if [ -f "package.json" ]; then
  echo -e "${GREEN}✅ Frontend app/package.json exists${NC}"
  if npm list typescript &>/dev/null; then
    echo -e "${GREEN}✅ TypeScript installed in frontend${NC}"
  else
    echo -e "${YELLOW}⚠️  TypeScript not fully installed, run: npm install${NC}"
  fi
else
  echo -e "${RED}❌ Frontend app not configured properly${NC}"
fi
cd - >/dev/null 2>&1
echo ""

echo -e "${YELLOW}6. Common Error: Missing Files${NC}"
echo "Checking for essential API files:"
for file in "api/auth.ts" "api/gemini.ts" "api/ai-handler.ts"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}  ✅ $file${NC}"
  else
    echo -e "${RED}  ❌ $file${NC}"
  fi
done
echo ""

echo -e "${YELLOW}7. Deployment Configuration${NC}"
if grep -q "ai-handler" vercel.json &>/dev/null; then
  echo -e "${GREEN}✅ vercel.json mentions API routing${NC}"
elif [ -f "vercel.json" ]; then
  echo -e "${YELLOW}⚠️  vercel.json exists but no explicit API routing configured${NC}"
else
  echo -e "${RED}❌ vercel.json not found${NC}"
fi
echo ""

echo -e "${GREEN}=========================================="
echo "SUMMARY & NEXT STEPS:${NC}"
echo ""
echo "If you see '❌ Unexpected token <' error:"
echo "1. Make sure GOOGLE_AI_API_KEY is set in Vercel Environment Variables"
echo "2. Verify /api/ai-handler.ts exists (just created)"
echo "3. Run: npm install (in root) and cd 每日科技脉搏 app && npm install"
echo "4. Redeploy to Vercel after changes"
echo ""
echo "To get GOOGLE_AI_API_KEY:"
echo "  Navigate to: https://aistudio.google.com/app/apikey"
echo "  Create new API key and copy it"
echo ""
