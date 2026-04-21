import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const DEEPSEEK_API_KEY = "sk-830498bcd4674c89b3d5c4ce368c43c8";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { company, industry, revenue } = body;

    if (!company || !industry) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "请提供企业名称和行业" }) };
    }

    // 只调用 DeepSeek，不搜索，确保在 20 秒内完成
    const dsResp = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是企业政策体检专家。根据企业信息生成JSON报告。严格只返回JSON，不要markdown。
格式：{"company":"名称","industry":"行业","revenue":"营收","companyProfile":"1句概况","summary":"50字摘要","totalEstimate":"补贴范围","items":[{"name":"政策名","match":"85%","subsidy":"金额","difficulty":"低/中/高","category":"推荐/可申报/潜力","description":"说明"}]}
规则：items 4-6个。全部中文。优先推荐河北省及保定市政策，兼顾国家级政策。基于你的知识判断，不编造具体金额。`,
          },
          {
            role: "user",
            content: `企业名称：${company}\n行业：${industry}\n年营收：${revenue || "未提供"}\n\n请生成政策匹配报告。`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!dsResp.ok) throw new Error(`AI分析失败: ${dsResp.status}`);
    const dsData = await dsResp.json();
    const content = dsData.choices?.[0]?.message?.content || "";

    let report;
    try {
      const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      report = JSON.parse(clean);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) report = JSON.parse(m[0]);
      else throw new Error("AI返回格式异常");
    }

    report.company = company;
    report.industry = industry;
    report.revenue = revenue || "未提供";

    return { statusCode: 200, headers, body: JSON.stringify(report) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "生成失败" }) };
  }
};
