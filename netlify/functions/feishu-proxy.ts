import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const FEISHU_APP_ID = "cli_a9544caa4e639bd8";
const FEISHU_APP_SECRET = "gzfYVifWaNNvfMpHJz0ExgnaD0SvGilM";
const FEISHU_APP_TOKEN = "LF3YbS1fOaqPTWsWo4bcKLe1nRh";
const FEISHU_TABLE_ID = "tblMqnYAwquMzMyQ";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const getAccessToken = async (): Promise<string> => {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error("获取 token 失败: " + data.msg);
  return data.tenant_access_token;
};

const fetchAllRecords = async (token: string): Promise<any[]> => {
  const allRecords: any[] = [];
  let pageToken = "";
  let hasMore = true;

  while (hasMore) {
    let apiUrl =
      "https://open.feishu.cn/open-apis/bitable/v1/apps/" +
      FEISHU_APP_TOKEN +
      "/tables/" +
      FEISHU_TABLE_ID +
      "/records?page_size=500";
    if (pageToken) apiUrl += "&page_token=" + encodeURIComponent(pageToken);

    const res = await fetch(apiUrl, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    if (data.code !== 0) throw new Error("获取记录失败: " + data.msg);

    allRecords.push(...(data.data.items || []));
    hasMore = data.data.has_more || false;
    pageToken = data.data.page_token || "";
  }

  return allRecords;
};

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const token = await getAccessToken();
    const records = await fetchAllRecords(token);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ code: 0, data: records }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ code: -1, msg: err.message }),
    };
  }
};
