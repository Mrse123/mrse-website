import { useState } from 'react'
import {
  Sparkles, ArrowRight, Building2, TrendingUp,
  Loader2, CheckCircle, AlertCircle, Phone, RefreshCw,
  Search, Globe
} from 'lucide-react'
import { Link } from 'react-router-dom'

const industries = [
  '制造业', '信息技术', '生物医药', '新材料', '新能源',
  '节能环保', '高端装备', '数字创意', '现代农业', '其他',
]

const revenueOptions = [
  '请选择（选填）',
  '500万以下',
  '500万-1000万',
  '1000万-3000万',
  '3000万-5000万',
  '5000万-1亿',
  '1亿以上',
]

type ReportItem = {
  name: string
  match: string
  subsidy: string
  difficulty: string
  description: string
}

type Report = {
  company: string
  industry: string
  revenue: string
  summary: string
  items: ReportItem[]
  totalEstimate: string
  sources?: string[]
}

export default function PolicyRadar() {
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [revenue, setRevenue] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<'searching' | 'analyzing'>('searching')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError('请输入企业名称')
      return
    }
    if (!industry) {
      setError('请选择所属行业')
      return
    }

    setError('')
    setLoading(true)
    setReport(null)
    setLoadingPhase('searching')

    // 3秒后自动切换到分析阶段（实际后端是串行的，这里只是给用户更好的体验）
    const phaseTimer = setTimeout(() => {
      setLoadingPhase('analyzing')
    }, 3000)

    try {
      const apiUrl = import.meta.env.DEV
        ? '/deepseek-proxy'
        : '/.netlify/functions/deepseek-proxy'

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyName.trim(),
          industry,
          revenue: revenue || '未提供',
        }),
      })

      if (!res.ok) throw new Error('请求失败: ' + res.status)
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setReport(data)
    } catch (err: any) {
      setError(err.message || '生成报告失败，请稍后重试')
    } finally {
      clearTimeout(phaseTimer)
      setLoading(false)
      setLoadingPhase('searching')
    }
  }

  const getMatchColor = (match: string) => {
    const num = parseInt(match)
    if (num >= 90) return { bg: '#dcfce7', text: '#166534' }
    if (num >= 75) return { bg: '#fef9c3', text: '#854d0e' }
    if (num >= 60) return { bg: '#ffedd5', text: '#9a3412' }
    return { bg: '#fee2e2', text: '#991b1b' }
  }

  const getDifficultyLabel = (d: string) => {
    if (d.includes('低') || d.includes('容易')) return { text: '难度：低', bg: '#dcfce7', color: '#166534' }
    if (d.includes('中')) return { text: '难度：中', bg: '#fef9c3', color: '#854d0e' }
    return { text: '难度：高', bg: '#fee2e2', color: '#991b1b' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #0f2540 100%)',
        padding: '60px 0 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -80, top: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(200,169,81,0.08)', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(200,169,81,0.15)', border: '1px solid rgba(200,169,81,0.3)',
            padding: '6px 16px', borderRadius: 20, marginBottom: 20
          }}>
            <Sparkles size={14} style={{ color: '#c8a951' }} />
            <span style={{ color: '#c8a951', fontSize: 13, fontWeight: 600 }}>AI 智能分析</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 16
          }}>
            AI 政策雷达
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7 }}>
            输入企业基本信息，AI 联网搜索最新政策，智能匹配生成专属报告
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '-30px auto 60px', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        {/* Form Card */}
        {!report && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            padding: '40px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #b45309, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1a3a5c' }}>免费政策匹配</h2>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>填写企业信息，AI 为您精准匹配</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Company Name */}
              <div>
                <label style={{
                  display: 'block', fontWeight: 600, fontSize: 14, color: '#334155',
                  marginBottom: 8
                }}>
                  <Building2 size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                  企业名称 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="请输入企业全称，如：保定市XX科技有限公司"
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 12,
                    border: '1px solid #e2e8f0', fontSize: 15,
                    outline: 'none', transition: 'border 0.2s',
                    background: '#f8fafc',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#c8a951'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Industry */}
              <div>
                <label style={{
                  display: 'block', fontWeight: 600, fontSize: 14, color: '#334155',
                  marginBottom: 8
                }}>
                  所属行业 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {industries.map(ind => (
                    <button
                      key={ind}
                      onClick={() => setIndustry(ind)}
                      style={{
                        padding: '10px 20px', borderRadius: 25,
                        border: industry === ind ? '2px solid #b45309' : '1px solid #e2e8f0',
                        background: industry === ind ? '#fffbeb' : '#fff',
                        color: industry === ind ? '#b45309' : '#64748b',
                        fontSize: 14, fontWeight: industry === ind ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revenue */}
              <div>
                <label style={{
                  display: 'block', fontWeight: 600, fontSize: 14, color: '#334155',
                  marginBottom: 8
                }}>
                  <TrendingUp size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                  年营收规模 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(选填)</span>
                </label>
                <select
                  value={revenue}
                  onChange={e => setRevenue(e.target.value)}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: 12,
                    border: '1px solid #e2e8f0', fontSize: 15,
                    outline: 'none', background: '#f8fafc',
                    color: revenue === '请选择（选填）' ? '#94a3b8' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {revenueOptions.map(opt => (
                    <option key={opt} value={opt === '请选择（选填）' ? '' : opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', borderRadius: 10,
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#dc2626', fontSize: 14
                }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 14,
                  border: 'none',
                  background: loading
                    ? '#d1d5db'
                    : 'linear-gradient(135deg, #b45309, #d97706)',
                  color: '#fff',
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(180,83,9,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="spin" />
                    AI 正在分析中，请稍候...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    生成我的政策匹配报告
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                完全免费 · 无需注册 · AI联网搜索实时政策
              </p>
            </div>

            <style>{`
              @keyframes spin { to { transform: rotate(360deg) } }
              .spin { animation: spin 1s linear infinite; }
            `}</style>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            background: '#fff', borderRadius: 20, padding: '60px 40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: loadingPhase === 'searching'
                ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                : 'linear-gradient(135deg, #b45309, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', color: '#fff'
            }}>
              <Loader2 size={36} className="spin" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1a3a5c', marginBottom: 24 }}>
              {loadingPhase === 'searching' ? '正在联网搜索最新政策...' : 'AI 正在分析匹配结果...'}
            </h2>

            {/* 进度步骤 */}
            <div style={{ maxWidth: 340, margin: '0 auto 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: loadingPhase === 'searching'
                    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                    : '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexShrink: 0
                }}>
                  {loadingPhase === 'searching' ? <Search size={18} /> : <CheckCircle size={18} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: loadingPhase === 'searching' ? '#1a3a5c' : '#22c55e' }}>
                    联网搜索政策
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {loadingPhase === 'searching' ? '搜索中...' : '搜索完成'}
                  </div>
                </div>
              </div>

              <div style={{ width: 2, height: 12, background: '#e2e8f0', margin: '0 auto' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, justifyContent: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: loadingPhase === 'analyzing'
                    ? 'linear-gradient(135deg, #b45309, #d97706)'
                    : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: loadingPhase === 'analyzing' ? '#fff' : '#94a3b8',
                  flexShrink: 0
                }}>
                  <Sparkles size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: loadingPhase === 'analyzing' ? '#1a3a5c' : '#94a3b8' }}>
                    AI 分析生成报告
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {loadingPhase === 'analyzing' ? '分析中...' : '等待搜索完成'}
                  </div>
                </div>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Globe size={14} />
              正在搜索最新政策数据，预计需要 20-40 秒
            </p>

            <style>{`
              @keyframes spin { to { transform: rotate(360deg) } }
              .spin { animation: spin 1s linear infinite; }
            `}</style>
          </div>
        )}

        {/* Report */}
        {report && !loading && (
          <div>
            {/* Report Header */}
            <div style={{
              background: '#fff', borderRadius: 20,
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              marginBottom: 24,
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #1a3a5c, #2563a8)',
                padding: '28px 32px', color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Sparkles size={22} style={{ color: '#c8a951' }} />
                      <span style={{ fontWeight: 700, fontSize: 18 }}>AI 政策匹配报告</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>
                        企业：{report.company}
                      </span>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>
                        行业：{report.industry}
                      </span>
                      {report.revenue !== '未提供' && (
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>
                          营收：{report.revenue}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setReport(null); setCompanyName(''); setIndustry(''); setRevenue('') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.15)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={14} />
                    重新查询
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: '28px 32px' }}>
                <div style={{
                  padding: 20, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(200,169,81,0.08), rgba(26,58,92,0.04))',
                  border: '1px solid rgba(200,169,81,0.15)',
                  marginBottom: 28
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3a5c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} style={{ color: '#b45309' }} />
                    AI 分析摘要
                  </div>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.9 }}>{report.summary}</p>
                </div>

                {/* Estimate */}
                <div style={{
                  padding: '24px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #b45309, #d97706)',
                  color: '#fff', textAlign: 'center', marginBottom: 28
                }}>
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>预计可获补贴金额</div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
                    {report.totalEstimate}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>* 实际金额以政府审批结果为准</div>
                </div>

                {/* Policy Items */}
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a3a5c', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} style={{ color: '#b45309' }} />
                  匹配政策列表
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {report.items.map((item, i) => {
                    const mc = getMatchColor(item.match)
                    const diff = getDifficultyLabel(item.difficulty)
                    return (
                      <div key={i} style={{
                        padding: 20, borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        transition: 'box-shadow 0.2s',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <h4 style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>
                              {i + 1}. {item.name}
                            </h4>
                            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>{item.description}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            <span style={{
                              padding: '5px 14px', borderRadius: 20,
                              background: mc.bg, color: mc.text,
                              fontSize: 13, fontWeight: 700,
                            }}>
                              匹配度 {item.match}
                            </span>
                            <span style={{
                              padding: '4px 12px', borderRadius: 20,
                              background: diff.bg, color: diff.color,
                              fontSize: 12, fontWeight: 600,
                            }}>
                              {diff.text}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8,
                          background: '#f0f4f8', color: '#1a3a5c',
                          fontSize: 13, fontWeight: 600
                        }}>
                          预计补贴：{item.subsidy}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Sources */}
                {report.sources && report.sources.length > 0 && (
                  <div style={{
                    marginTop: 24, padding: '16px 20px', borderRadius: 10,
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                  }}>
                    <div style={{
                      fontWeight: 600, fontSize: 12, color: '#64748b',
                      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      <Globe size={13} />
                      信息来源（联网搜索）
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {report.sources.slice(0, 5).map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12, color: '#2563eb', textDecoration: 'none',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div style={{
              background: '#fff', borderRadius: 20,
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#1a3a5c', marginBottom: 12 }}>
                想要获取详细的申报方案？
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
                以上结果由 AI 联网搜索最新政策并智能匹配生成，仅供参考。<br />
                联系我们的专家，获取一对一免费咨询和定制化申报方案。
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/contact" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #b45309, #d97706)',
                  color: '#fff', padding: '14px 28px', borderRadius: 12,
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(180,83,9,0.3)',
                }}>
                  免费咨询专家
                  <ArrowRight size={16} />
                </Link>
                <a href="tel:19912123125" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 12,
                  border: '2px solid #1a3a5c', color: '#1a3a5c',
                  fontWeight: 600, fontSize: 15, textDecoration: 'none',
                }}>
                  <Phone size={16} />
                  19912123125
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
