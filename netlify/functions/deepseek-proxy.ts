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

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action, company, industry, revenue } = body;

    // 唯一 action：一步生成完整报告
    if (action === "generate-report") {
      if (!company || !industry) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "请提供企业名称和行业" }) };
      }

      // 并行：搜公司信息 + 搜政策
      const [companyResp, policyResp] = await Promise.all([
        fetch(TAVILY_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
          body: JSON.stringify({
            query: `${company} 企业简介 经营范围 注册资本`,
            search_depth: "basic", max_results: 3, include_answer: true, topic: "general",
          }),
        }),
        fetch(TAVILY_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
          body: JSON.stringify({
            query: `${industry}行业 政策补贴 申报条件 2025 2026 ${company}`,
            search_depth: "basic", max_results: 5, include_answer: true, topic: "general",
          }),
        }),
      ]);

      const companyData = await companyResp.json();
      const policyData = await policyResp.json();

      // 拼接搜索上下文（截断控制长度）
      const companyInfo = (companyData.results || [])
        .filter((r: any) => r.content && /[\u4e00-\u9fff]/.test(r.content))
        .slice(0, 2)
        .map((r: any) => r.content.replace(/\s+/g, " ").trim().slice(0, 150))
        .join("；");

      const policyInfo = (policyData.results || [])
        .slice(0, 5)
        .map((r: any) => `${r.title}: ${(r.content || "").slice(0, 120)}`)
        .join("\n");

      const sources = [...new Set(
        [...(companyData.results || []), ...(policyData.results || [])]
          .map((r: any) => r.url)
          .filter(Boolean)
      )].slice(0, 6);

      // DeepSeek 生成报告
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
              content: `你是企业政策体检专家。根据企业信息和搜索结果生成JSON报告。严格只返回JSON。
格式：{"company":"名称","industry":"行业","revenue":"营收","companyProfile":"1句概况","summary":"AI摘要50字","totalEstimate":"补贴范围","qualifications":[{"name":"资质名","status":"已具备/未具备/需补充","note":"说明"}],"recommendations":[{"name":"建议","detail":"内容","impact":"影响"}],"items":[{"name":"政策名","match":"85%","subsidy":"金额","difficulty":"低/中/高","category":"推荐/可申报/潜力","description":"说明"}],"sources":["url"]}
规则：items 4-6个，qualifications 3项，recommendations 2条。全部中文。基于搜索结果，不编造。`,
            },
            {
              role: "user",
              content: `企业:${company}|行业:${industry}|营收:${revenue||"未提供"}\n公司:${companyInfo||"未知"}\n政策:\n${policyInfo}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1200,
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
      report.sources = [...new Set([...(report.sources || []), ...sources])].slice(0, 8);

      return { statusCode: 200, headers, body: JSON.stringify(report) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "无效操作" }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "生成失败" }) };
  }
};
