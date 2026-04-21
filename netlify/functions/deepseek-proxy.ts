import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const DEEPSEEK_API_KEY = "sk-830498bcd4674c89b3d5c4ce368c43c8";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const TAVILY_API_KEY = "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";
const TAVILY_API_URL = "https://api.tavily.com/search";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// 搜索公司信息（Step 1 用）
async function searchCompanyInfo(company: string) {
  const query = `${company} 企业简介 经营范围 注册资本 行业`;

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 4,
      include_answer: true,
      topic: "general",
      include_domains: ["tianyancha.com", "qcc.com", "aiqicha.baidu.com", "baike.baidu.com"],
    }),
  });

  if (!response.ok) throw new Error(`搜索失败: ${response.status}`);
  const data = await response.json();

  const cnResults = (data.results || [])
    .filter((r: any) => r.content && /[\u4e00-\u9fff]/.test(r.content))
    .slice(0, 3);

  let answer = "";
  if (cnResults.length > 0) {
    answer = cnResults.map((r: any) => r.content.replace(/\s+/g, " ").trim().slice(0, 200)).join("\n");
  } else {
    answer = "";
  }

  return { ...data, answer };
}

// 搜索政策（Step 2 用，单独一次请求）
async function searchPolicies(company: string, industry: string, revenue: string) {
  // 并行搜索：政策 + 公司具体政策匹配
  const [policyResp, matchResp] = await Promise.all([
    // 搜索行业通用政策
    fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
      body: JSON.stringify({
        query: `${industry}行业 政策补贴 申报条件 2024 2025 2026`,
        search_depth: "basic", max_results: 5, include_answer: true, topic: "general",
      }),
    }),
    // 搜索该公司 + 政策
    fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
      body: JSON.stringify({
        query: `${company} 高新技术 专精特新 科技型中小企业 政策补贴 河北`,
        search_depth: "basic", max_results: 3, include_answer: false, topic: "general",
      }),
    }),
  ]);

  const policyData = await policyResp.json();
  const matchData = await matchResp.json();

  // 合并结果
  const allResults = [...(policyData.results || []), ...(matchData.results || [])];
  const policyAnswer = policyData.answer || "";

  // 提取搜索摘要
  const contents = allResults
    .slice(0, 8)
    .map((r: any, i: number) => `[${i + 1}] ${r.title}: ${(r.content || "").slice(0, 150)}`)
    .join("\n");

  const sourceUrls = allResults
    .slice(0, 6)
    .map((r: any) => r.url)
    .filter(Boolean);

  return { policyAnswer, contents, sourceUrls };
}

// 用 DeepSeek 生成完整体检报告（Step 3，单独一次请求）
async function generateFullReport(company: string, industry: string, revenue: string, companyInfo: string, policyData: any) {
  const SYSTEM_PROMPT = `你是企业政策体检专家。根据企业信息和政策搜索结果，生成JSON格式的企业政策体检报告。

严格返回以下JSON，不要返回其他任何内容：
{
  "company": "企业名称",
  "industry": "行业",
  "revenue": "营收",
  "companyProfile": "企业概况（1-2句中文）",
  "summary": "AI分析摘要（2-3句，概括企业政策申报潜力和最大机会）",
  "totalEstimate": "预计可获补贴总金额范围（如：50-150万元/年）",
  "qualifications": [
    {"name": "资质名称", "status": "已具备/未具备/需补充", "note": "简短说明"}
  ],
  "recommendations": [
    {"name": "专利申请建议", "detail": "具体建议内容，如：申请2件发明专利+5件软著", "impact": "可多获补贴约XX万元"}
  ],
  "items": [
    {
      "name": "政策名称",
      "match": "匹配度百分比",
      "subsidy": "预计补贴金额或优惠",
      "difficulty": "申报难度",
      "category": "推荐/可申报/潜力",
      "deadline": "申报时间（如：每年6-8月，或：常年可申报）",
      "description": "政策说明（1句）",
      "reason": "匹配此政策的具体原因",
      "conditions": [
        {"name": "条件名称", "status": "满足/不满足/未知", "note": "说明"}
      ]
    }
  ],
  "sources": ["来源URL"]
}

规则：
1. 只基于搜索结果生成，不编造政策
2. items 至少 5-8 个政策，覆盖推荐、可申报、潜力三个等级
3. category 分为：推荐（匹配度80%+）、可申报（50-80%）、潜力（<50%但值得准备）
4. 每个政策给出条件对照 conditions，至少3个条件
5. qualifications 给出企业现有资质评估，至少4项
6. recommendations 至少2条提升建议
7. 全部用中文`;

  const userPrompt = `企业：${company} | 行业：${industry} | 营收：${revenue}
公司信息：${companyInfo || "未获取到详细信息"}

政策搜索结果：
${policyData.policyAnswer}
${policyData.contents}

请生成该企业的政策体检报告。`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI分析失败: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  let report;
  try {
    const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    report = JSON.parse(clean);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      report = JSON.parse(m[0]);
    } else {
      throw new Error("AI返回格式异常，请重试");
    }
  }

  // 附带搜索来源
  report.sources = [...(report.sources || []), ...(policyData.sourceUrls || [])];
  report.sources = [...new Set(report.sources)].slice(0, 8);

  return report;
}

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action, company, industry, revenue, companyInfo, policyData } = body;

    // Action 1: 搜索公司信息（Step 1）
    if (action === "search-company") {
      if (!company) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "请输入企业名称" }) };
      }
      const results = await searchCompanyInfo(company);
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          companyInfo: results.answer || "",
          searchResults: (results.results || []).slice(0, 3).map((r: any) => ({
            title: r.title, content: r.content, url: r.url,
          })),
        }),
      };
    }

    // Action 2: 搜索政策（Step 2，独立请求，10秒内完成）
    if (action === "search-policy") {
      if (!company || !industry) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "请提供企业名称和行业" }) };
      }
      const policyData = await searchPolicies(company, industry, revenue || "未提供");
      return { statusCode: 200, headers, body: JSON.stringify(policyData) };
    }

    // Action 3: 生成报告（Step 3，独立请求，20秒内完成）
    if (action === "generate-report") {
      if (!company || !industry || !policyData) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "参数不完整" }) };
      }
      const report = await generateFullReport(company, industry, revenue || "未提供", companyInfo || "", policyData);
      return { statusCode: 200, headers, body: JSON.stringify(report) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "无效操作" }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "操作失败" }) };
  }
};
