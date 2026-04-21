import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const FEISHU_APP_ID = "cli_a9544caa4e639bd8";
const FEISHU_APP_SECRET = "gzfYVifWaNNvfMpHJz0ExgnaD0SvGilM";
const FEISHU_APP_TOKEN = "LF3YbS1fOaqPTWsWo4bcKLe1nRh";
const PASSWORD_TABLE_ID = "tbl3iZzUhl9dEhxW";
const ANNUAL_FEE_TABLE_ID = "tblMqnYAwquMzMyQ";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

let cachedToken: string | null = null;
let tokenExpireTime = 0;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < tokenExpireTime) return cachedToken;
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
  cachedToken = data.tenant_access_token;
  tokenExpireTime = Date.now() + (data.expire - 60) * 1000;
  return cachedToken;
};

const fetchAllRecords = async (
  token: string,
  tableId: string
): Promise<any[]> => {
  const allRecords: any[] = [];
  let pageToken = "";
  let hasMore = true;

  while (hasMore) {
    let apiUrl =
      "https://open.feishu.cn/open-apis/bitable/v1/apps/" +
      FEISHU_APP_TOKEN +
      "/tables/" +
      tableId +
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

// 获取客户列表（公司名+密码hash，用于搜索和验证）
const getClientList = async (token: string) => {
  const records = await fetchAllRecords(token, PASSWORD_TABLE_ID);
  return records
    .map((r) => ({
      companyName: r.fields["公司名称"]?.[0]?.text || r.fields["公司名称"] || "",
      password: r.fields["密码"]?.[0]?.text || r.fields["密码"] || "",
    }))
    .filter((r) => r.companyName);
};

// 验证公司+密码
const verifyClient = async (
  token: string,
  companyName: string,
  password: string
) => {
  const clients = await getClientList(token);
  const client = clients.find(
    (c) => c.companyName === companyName && c.password === password
  );
  return !!client;
};

// 获取某公司的年费数据
const getCompanyFees = async (token: string, companyName: string) => {
  const records = await fetchAllRecords(token, ANNUAL_FEE_TABLE_ID);
  const companyRecords = records.filter(
    (r) =>
      (r.fields["公司名称"]?.[0]?.text || r.fields["公司名称"] || "") ===
      companyName
  );
  return companyRecords.map((r) => r.fields);
};

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const token = await getAccessToken();
    const path = event.path || "";

    // POST /api/client-auth/action
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const action = body.action;

      if (action === "search") {
        // 搜索公司（模糊匹配）
        const keyword = (body.keyword || "").trim();
        if (!keyword) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: 0, data: [] }),
          };
        }
        const clients = await getClientList(token);
        const matched = clients.filter((c) =>
          c.companyName.toLowerCase().includes(keyword.toLowerCase())
        );
        // 只返回公司名，不返回密码
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            code: 0,
            data: matched.map((c) => c.companyName),
          }),
        };
      }

      if (action === "verify") {
        // 验证公司+密码
        const { companyName, password } = body;
        if (!companyName || !password) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: -1, msg: "公司名称和密码不能为空" }),
          };
        }
        const valid = await verifyClient(token, companyName, password);
        if (valid) {
          // 验证通过，获取年费数据
          const fees = await getCompanyFees(token, companyName);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: 0, data: fees }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ code: -1, msg: "公司名称或密码错误" }),
        };
      }
    }

      if (action === "register") {
        // 注册新客户
        const { companyName, password } = body;
        if (!companyName || !password) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: -1, msg: "公司名称和密码不能为空" }),
          };
        }
        if (password.length < 6) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: -1, msg: "密码长度不能少于6位" }),
          };
        }
        // 检查是否已注册
        const clients = await getClientList(token);
        const exists = clients.find(
          (c) => c.companyName === companyName
        );
        if (exists) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: -1, msg: "该公司已注册，请直接登录" }),
          };
        }
        // 写入飞书表
        const createRes = await fetch(
          "https://open.feishu.cn/open-apis/bitable/v1/apps/" +
            FEISHU_APP_TOKEN +
            "/tables/" +
            PASSWORD_TABLE_ID +
            "/records",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: {
                公司名称: companyName,
                密码: password,
                来源: "客户自主注册",
              },
            }),
          }
        );
        const createData = await createRes.json();
        if (createData.code !== 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ code: -1, msg: "注册失败: " + createData.msg }),
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ code: 0, msg: "注册成功" }),
        };
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "不支持的请求" }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ code: -1, msg: err.message }),
    };
  }
};
