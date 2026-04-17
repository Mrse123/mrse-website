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

// Step 1: 用 Tavily 搜索最新政策
async function searchPolicies(company: string, industry: string, revenue: string) {
  const query = `${industry}行业 企业 政策补贴 申报 高新技术 专精特新 科技型中小企业 ${revenue !== "未提供" ? revenue + "营收" : ""} 2024 2025`;

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: true,
      topic: "general",
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily 搜索失败: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Step 2: 用 DeepSeek 根据搜索结果生成报告
async function generateReport(company: string, industry: string, revenue: string, searchResults: any) {
  const searchAnswer = searchResults.answer || "";
  const searchContents = searchResults.results
    ?.slice(0, 6)
    .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n") || "";

  const sources = searchResults.results
    ?.slice(0, 5)
    .map((r: any) => `- ${r.title}: ${r.url}`)
    .join("\n") || "";

  const SYSTEM_PROMPT = `你是河北玛仕知识产权服务有限公司的AI政策匹配助手。根据网络搜索到的最新政策信息，结合企业情况生成《政策匹配报告》。

严格按照以下JSON格式返回，不要返回任何其他内容：
{
  "company": "企业名称",
  "industry": "行业",
  "revenue": "营收",
  "summary": "AI分析摘要（2-3句话，基于搜索到的真实政策分析）",
  "totalEstimate": "预计可获补贴总金额范围（如 20-50万元）",
  "items": [
    {
      "name": "政策名称",
      "match": "匹配度百分比（如 90%）",
      "subsidy": "预计补贴金额或优惠",
      "difficulty": "申报难度（低/中/高）",
      "description": "政策简要说明（1-2句话）"
    }
  ],
  "sources": ["信息来源URL列表"]
}

重要规则：
1. 只基于下方提供的搜索结果生成报告，不要编造搜索结果中没有的政策
2. 如果搜索结果不足，如实说明，不要凭空编造具体金额
3. 每次匹配3-5个最相关的政策
4. 匹配度要根据企业实际情况合理分布
5. 优先推荐河北及保定本地政策
6. 补贴金额必须基于搜索到的政策原文，不要猜测
7. sources 字段填入搜索结果的来源URL

只返回JSON，不要加任何markdown代码块标记。`;

  const userPrompt = `企业信息：
- 企业名称：${company}
- 所属行业：${industry}
- 年营收规模：${revenue}

以下是联网搜索到的最新政策信息：

=== AI搜索摘要 ===
${searchAnswer}

=== 搜索结果详情 ===
${searchContents}

请基于以上搜索结果，为该企业生成政策匹配报告。`;

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
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API 错误: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  let report;
  try {
    const cleanContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    report = JSON.parse(cleanContent);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      report = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("AI 返回的数据格式异常，请重试");
    }
  }

  // 附带搜索来源
  report.sources = report.sources || [];
  if (searchResults.results) {
    searchResults.results.slice(0, 5).forEach((r: any) => {
      if (r.url && !report.sources.includes(r.url)) {
        report.sources.push(r.url);
      }
    });
  }

  return report;
}

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { company, industry, revenue } = body;

    if (!company || !industry) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "请提供企业名称和行业" }),
      };
    }

    // Step 1: Tavily 搜索
    const searchResults = await searchPolicies(
      company,
      industry,
      revenue || "未提供"
    );

    // Step 2: DeepSeek 生成报告
    const report = await generateReport(
      company,
      industry,
      revenue || "未提供",
      searchResults
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "生成报告失败" }),
    };
  }
};
