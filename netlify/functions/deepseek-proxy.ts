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

// Step 1: 用 Tavily 搜索公司信息
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
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
      include_raw_content: false,
      topic: "general",
      // 限定中文网站，确保结果为中文
      include_domains: ["tianyancha.com", "qcc.com", "qixin.com", "aiqicha.baidu.com", "baike.baidu.com"],
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily 搜索失败: ${response.status}`);
  }

  const data = await response.json();

  // 提取中文搜索结果内容
  const cnResults = (data.results || [])
    .filter((r: any) => r.content && /[\u4e00-\u9fff]/.test(r.content))
    .slice(0, 3);

  let answer = "";
  if (cnResults.length > 0) {
    answer = cnResults
      .map((r: any) => r.content.replace(/\s+/g, " ").trim().slice(0, 200))
      .join("\n");
  } else {
    // 中文域名也搜不到，尝试不加域名限制再搜一次
    const fallbackResp = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: `${company} 公司 简介 经营范围 注册资本`,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
        topic: "general",
      }),
    });
    
    if (fallbackResp.ok) {
      const fallbackData = await fallbackResp.json();
      const fbResults = (fallbackData.results || [])
        .filter((r: any) => r.content && /[\u4e00-\u9fff]/.test(r.content))
        .slice(0, 2);
      if (fbResults.length > 0) {
        answer = fbResults
          .map((r: any) => r.content.replace(/\s+/g, " ").trim().slice(0, 200))
          .join("\n");
      }
    }
    
    if (!answer) {
      answer = `已搜索到"${company}"相关信息，请查看下方来源链接了解详情。`;
    }
  }

  return {
    ...data,
    answer,
  };
}

// Step 2: 用 Tavily 搜索政策（精简版，加快速度）
async function searchPolicies(industry: string, revenue: string) {
  const query = `${industry}行业 政策补贴 申报 高新技术 专精特新 河北 2024 2025`;

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
      include_raw_content: false,
      topic: "general",
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily 搜索失败: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Step 3: 用 DeepSeek 根据搜索结果生成报告
async function generateReport(company: string, industry: string, revenue: string, companyInfo: string, policyResults: any) {
  const policyAnswer = policyResults.answer || "";
  const policyContents = policyResults.results
    ?.slice(0, 6)
    .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n") || "";

  const sources = policyResults.results
    ?.slice(0, 5)
    .map((r: any) => `- ${r.title}: ${r.url}`)
    .join("\n") || "";

  const SYSTEM_PROMPT = `你是AI政策匹配助手。根据企业信息和政策搜索结果，生成JSON格式报告。

严格返回以下JSON，不要返回其他内容：
{
  "company": "企业名称",
  "industry": "行业",
  "revenue": "营收",
  "companyProfile": "企业概况（1-2句话）",
  "summary": "AI分析摘要（1-2句话）",
  "totalEstimate": "预计可获补贴总金额范围",
  "items": [
    {
      "name": "政策名称",
      "match": "匹配度百分比",
      "subsidy": "预计补贴金额或优惠",
      "difficulty": "申报难度（低/中/高）",
      "description": "政策说明+匹配原因（1句话）",
      "reason": "匹配此政策的具体原因"
    }
  ],
  "sources": ["来源URL"]
}

规则：只基于搜索结果生成，不编造；匹配3-4个政策；优先河北本地政策。只返回JSON。`;

  const policyAnswer = policyResults.answer || "";
  const policyContents = policyResults.results
    ?.slice(0, 4)
    .map((r: any, i: number) => `[${i + 1}] ${r.title}: ${r.content?.slice(0, 150) || ""}`)
    .join("\n") || "";

  const userPrompt = `企业：${company} | 行业：${industry} | 营收：${revenue}
公司信息：${companyInfo || "无"}

政策搜索结果：
${policyAnswer}
${policyContents}

生成该企业的政策匹配报告。`;

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
      max_tokens: 2000,
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
  if (policyResults.results) {
    policyResults.results.slice(0, 5).forEach((r: any) => {
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
    const { action, company, industry, revenue, companyInfo } = body;

    // Action 1: 搜索公司信息
    if (action === "search-company") {
      if (!company) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "请输入企业名称" }),
        };
      }

      const companyResults = await searchCompanyInfo(company);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          companyInfo: companyResults.answer || "",
          searchResults: (companyResults.results || []).slice(0, 3).map((r: any) => ({
            title: r.title,
            content: r.content,
            url: r.url,
          })),
        }),
      };
    }

    // Action 2: 搜索公司 + 政策 + 生成报告
    if (action === "generate-report") {
      if (!company || !industry) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "请提供企业名称和行业" }),
        };
      }

      // Step 1: 使用前端传来的公司信息（已搜索过），省掉重复搜索
      const finalCompanyInfo = companyInfo || "";

      // Step 2: 搜索政策（精简查询，加快速度）
      const policyResults = await searchPolicies(industry, revenue || "未提供");

      // Step 3: DeepSeek 生成报告（减少 max_tokens 加快速度）
      const report = await generateReport(
        company,
        industry,
        revenue || "未提供",
        finalCompanyInfo,
        policyResults
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(report),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "无效的操作类型" }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "操作失败" }),
    };
  }
};
