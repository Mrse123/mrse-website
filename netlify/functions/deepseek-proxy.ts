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
  const SYSTEM_PROMPT = `你是企业政策体检专家。根据企业信息和政策搜索结果，生成JSON报告。严格返回JSON，不要返回其他任何内容。

格式：
{"company":"名称","industry":"行业","revenue":"营收","companyProfile":"1句概况","summary":"1句AI摘要","totalEstimate":"补贴范围","qualifications":[{"name":"资质","status":"已具备/未具备/需补充","note":"说明"}],"recommendations":[{"name":"建议","detail":"内容","impact":"影响"}],"items":[{"name":"政策","match":"85%","subsidy":"金额","difficulty":"低/中/高","category":"推荐/可申报/潜力","description":"1句说明"}],"sources":["url"]}

规则：
1.只基于搜索结果，不编造
2.items 4-6个，分推荐/可申报/潜力
3.qualifications 3项
4.recommendations 2条
5.全部中文，简洁

  const userPrompt = `企业：${company}|行业：${industry}|营收：${revenue}
公司信息：${companyInfo || "未知"}
政策搜索：${policyData.policyAnswer || ""}
${policyData.contents.slice(0, 800)}
生成报告。`;

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
      temperature: 0.3,
      max_tokens: 1500,
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
