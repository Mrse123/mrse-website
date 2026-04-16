import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const FEISHU_APP_ID = 'cli_a9544caa4e639bd8'
const FEISHU_APP_SECRET = 'gzfYVifWaNNvfMpHJz0ExgnaD0SvGilM'
const FEISHU_APP_TOKEN = 'LF3YbS1fOaqPTWsWo4bcKLe1nRh'
const FEISHU_TABLE_ID = 'tblMqnYAwquMzMyQ'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/feishu-api/proxy/records': {
        target: 'https://open.feishu.cn',
        changeOrigin: true,
        bypass: async (_req, res) => {
          if (!res) return undefined

          try {
            const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                app_id: FEISHU_APP_ID,
                app_secret: FEISHU_APP_SECRET,
              }),
            })
            const tokenData: any = await tokenRes.json()
            if (tokenData.code !== 0) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ code: -1, msg: '获取token失败' }))
              return false
            }
            const token = tokenData.tenant_access_token

            const allRecords: any[] = []
            let pageToken = ''
            let hasMore = true
            while (hasMore) {
              let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`
              if (pageToken) url += `&page_token=${encodeURIComponent(pageToken)}`

              const recordsRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
              })
              const recordsData: any = await recordsRes.json()
              if (recordsData.code !== 0) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ code: -1, msg: '获取记录失败' }))
                return false
              }
              allRecords.push(...(recordsData.data.items || []))
              hasMore = recordsData.data.has_more || false
              pageToken = recordsData.data.page_token || ''
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ code: 0, data: allRecords }))
            return false
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ code: -1, msg: err.message || '未知错误' }))
            return false
          }
        },
      },
    },
  },
})
