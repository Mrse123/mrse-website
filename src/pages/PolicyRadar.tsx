import { useState } from 'react'
import {
  Sparkles, ArrowRight, Building2, TrendingUp,
  Loader2, CheckCircle, AlertCircle, Phone, RefreshCw,
  Search, Globe, ChevronRight, Shield, Target, Lightbulb, Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'

const industries = [
  '制造业', '信息技术', '生物医药', '新材料', '新能源',
  '节能环保', '高端装备', '数字创意', '现代农业', '其他',
]

const revenueOptions = [
  '请选择（选填）',
  '500万以下', '500万-1000万', '1000万-3000万',
  '3000万-5000万', '5000万-1亿', '1亿以上',
]

type Qualification = { name: string; status: string; note: string }
type Condition = { name: string; status: string; note: string }
type Recommendation = { name: string; detail: string; impact: string }

type ReportItem = {
  name: string; match: string; subsidy: string; difficulty: string
  category: string; deadline?: string; description: string; reason?: string
  conditions?: Condition[]
}

type Report = {
  company: string; industry: string; revenue: string
  companyProfile?: string; summary: string; items: ReportItem[]
  totalEstimate: string; sources?: string[]
  qualifications?: Qualification[]; recommendations?: Recommendation[]
}

type Step = 'form' | 'company-info' | 'loading' | 'report'

export default function PolicyRadar() {
  const [step, setStep] = useState<Step>('form')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [revenue, setRevenue] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState('searching-policy')
  const [error, setError] = useState('')
  const [companyInfo, setCompanyInfo] = useState('')
  const [report, setReport] = useState<Report | null>(null)

  const apiUrl = import.meta.env.DEV
    ? '/deepseek-proxy'
    : '/.netlify/functions/deepseek-proxy'

  // Step 1: 搜索公司
  const handleSearchCompany = async () => {
    if (!companyName.trim()) { setError('请输入企业名称'); return }
    setError(''); setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search-company', company: companyName.trim() }),
      })
      if (!res.ok) throw new Error('请求失败')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCompanyInfo(data.companyInfo || '')
      setStep('company-info')
    } catch (err: any) {
      setError(err.message || '搜索失败，请重试')
    } finally { setLoading(false) }
  }

  // Step 2: 先搜政策（第一次请求），再生成报告（第二次请求）
  const handleGenerateReport = async () => {
    if (!industry) { setError('请选择所属行业'); return }
    setError(''); setLoading(true); setStep('loading')
    setLoadingPhase('searching-policy')

    try {
      // === 第一次请求：搜索政策（15秒超时） ===
      const controller1 = new AbortController()
      const timer1 = setTimeout(() => controller1.abort(), 15000)
      const policyRes = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search-policy',
          company: companyName.trim(), industry,
          revenue: revenue || '未提供',
        }),
        signal: controller1.signal,
      })
      clearTimeout(timer1)
      if (!policyRes.ok) throw new Error('政策搜索失败')
      const pData = await policyRes.json()
      if (pData.error) throw new Error(pData.error)

      // === 第二次请求：DeepSeek 生成报告（22秒超时） ===
      setLoadingPhase('analyzing')
      const controller2 = new AbortController()
      const timer2 = setTimeout(() => controller2.abort(), 22000)
      const reportRes = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-report',
          company: companyName.trim(), industry,
          revenue: revenue || '未提供',
          companyInfo, policyData: pData,
        }),
        signal: controller2.signal,
      })
      clearTimeout(timer2)
      if (!reportRes.ok) throw new Error('报告生成失败')
      const data = await reportRes.json()
      if (data.error) throw new Error(data.error)

      setReport(data)
      setStep('report')
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('请求超时，请稍后重试')
      } else {
        setError(err.message || '生成失败，请重试')
      }
      setStep('company-info')
    } finally { setLoading(false) }
  }

  const handleReset = () => {
    setStep('form'); setCompanyName(''); setIndustry('')
    setRevenue(''); setCompanyInfo('')
    setReport(null); setError('')
  }

  const getMatchColor = (match: string) => {
    const num = parseInt(match)
    if (num >= 80) return { bg: '#dcfce7', text: '#166534' }
    if (num >= 60) return { bg: '#fef9c3', text: '#854d0e' }
    return { bg: '#ffedd5', text: '#9a3412' }
  }

  const getDiffStyle = (d: string) => {
    if (d.includes('低') || d.includes('容易')) return { text: '低', bg: '#dcfce7', color: '#166534' }
    if (d.includes('中')) return { text: '中', bg: '#fef9c3', color: '#854d0e' }
    return { text: '高', bg: '#fee2e2', color: '#991b1b' }
  }

  const getCategoryStyle = (cat: string) => {
    if (cat.includes('推荐')) return { text: '🔥 强烈推荐', bg: '#dcfce7', color: '#166534' }
    if (cat.includes('潜力')) return { text: '💡 潜力政策', bg: '#f0f4f8', color: '#64748b' }
    return { text: '📋 可申报', bg: '#fffbeb', color: '#92400e' }
  }

  const getQualStatus = (s: string) => {
    if (s.includes('已')) return { icon: '✅', color: '#166534' }
    if (s.includes('需') || s.includes('不')) return { icon: '⚠️', color: '#9a3412' }
    return { icon: '❓', color: '#64748b' }
  }

  const condStatus = (s: string) => {
    if (s.includes('满足') || s.includes('达标')) return { bg: '#dcfce7', color: '#166534', text: '满足' }
    if (s.includes('不满足') || s.includes('不足')) return { bg: '#fee2e2', color: '#991b1b', text: '不满足' }
    return { bg: '#f0f4f8', color: '#64748b', text: '待确认' }
  }

  // 分组政策
  const groupItems = (items: ReportItem[]) => {
    const rec = items.filter(i => i.category?.includes('推荐'))
    const normal = items.filter(i => !i.category?.includes('推荐') && !i.category?.includes('潜力'))
    const pot = items.filter(i => i.category?.includes('潜力'))
    return { rec, normal, pot }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #0f2540 100%)', padding: '60px 0 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -80, top: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(200,169,81,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,169,81,0.15)', border: '1px solid rgba(200,169,81,0.3)', padding: '6px 16px', borderRadius: 20, marginBottom: 20 }}>
            <Sparkles size={14} style={{ color: '#c8a951' }} />
            <span style={{ color: '#c8a951', fontSize: 13, fontWeight: 600 }}>AI 智能分析</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 16 }}>AI 政策雷达</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7 }}>输入企业名称，AI 自动搜索企业信息与最新政策，智能匹配生成专属体检报告</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '-30px auto 60px', padding: '0 24px', position: 'relative', zIndex: 2 }}>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28, padding: '12px 20px', background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
          {[
            { label: '输入企业', s: 'form' },
            { label: '企业信息', s: 'company-info' },
            { label: '体检报告', s: 'report' },
          ].map((item, i) => {
            const isActive = step === item.s || (item.s === 'report' && step === 'loading')
            const isDone = (item.s === 'form' && step !== 'form') || (item.s === 'company-info' && (step === 'loading' || step === 'report')) || (item.s === 'report' && step === 'report')
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#22c55e' : isActive ? 'linear-gradient(135deg, #b45309, #d97706)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDone || isActive ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                  {isDone ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: isActive || isDone ? 600 : 400, color: isActive || isDone ? '#1a3a5c' : '#94a3b8' }}>{item.label}</span>
                {i < 2 && <ChevronRight size={16} style={{ color: '#cbd5e1' }} />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Form */}
        {step === 'form' && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '40px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #b45309, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Sparkles size={22} /></div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1a3a5c' }}>免费政策体检</h2>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>输入企业名称，AI 为您全面体检政策申报潜力</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 8 }}>
                  <Building2 size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                  企业名称 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchCompany()} placeholder="请输入企业全称，如：保定市XX科技有限公司"
                    style={{ flex: 1, padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', background: '#f8fafc' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#c8a951'} onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'} />
                  <button onClick={handleSearchCompany} disabled={loading || !companyName.trim()}
                    style={{ padding: '14px 24px', borderRadius: 12, border: 'none', background: loading || !companyName.trim() ? '#d1d5db' : 'linear-gradient(135deg, #b45309, #d97706)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading || !companyName.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}搜索企业
                  </button>
                </div>
              </div>
              {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14 }}><AlertCircle size={16} />{error}</div>}
              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>完全免费 · 无需注册 · AI联网搜索实时政策</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } } .spin { animation: spin 1s linear infinite; }`}</style>
          </div>
        )}

        {/* Step 2: Select Industry */}
        {step === 'company-info' && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '36px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Building2 size={20} /></div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1a3a5c' }}>{companyName}</h2>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>请选择行业信息以生成体检报告</p>
              </div>
              <button onClick={handleReset} style={{ padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>重新搜索</button>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 10 }}>所属行业 <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {industries.map(ind => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    style={{ padding: '10px 20px', borderRadius: 25, border: industry === ind ? '2px solid #b45309' : '1px solid #e2e8f0', background: industry === ind ? '#fffbeb' : '#fff', color: industry === ind ? '#b45309' : '#64748b', fontSize: 14, fontWeight: industry === ind ? 600 : 400, cursor: 'pointer' }}>{ind}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 10 }}>
                <TrendingUp size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />年营收规模 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(选填)</span>
              </label>
              <select value={revenue} onChange={e => setRevenue(e.target.value)} style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', background: '#f8fafc', cursor: 'pointer' }}>
                {revenueOptions.map(opt => <option key={opt} value={opt === '请选择（选填）' ? '' : opt}>{opt}</option>)}
              </select>
            </div>
            {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14, marginBottom: 16 }}><AlertCircle size={16} />{error}</div>}
            <button onClick={handleGenerateReport} disabled={loading || !industry}
              style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: loading || !industry ? '#d1d5db' : 'linear-gradient(135deg, #b45309, #d97706)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: loading || !industry ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: loading || !industry ? 'none' : '0 4px 20px rgba(180,83,9,0.3)' }}>
              {loading ? <Loader2 size={20} className="spin" /> : <Sparkles size={20} />}
              {loading ? 'AI 正在分析中...' : '生成政策体检报告'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div style={{ background: '#fff', borderRadius: 20, padding: '60px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: loadingPhase === 'searching-policy' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'linear-gradient(135deg, #b45309, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#fff' }}>
              <Loader2 size={36} className="spin" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1a3a5c', marginBottom: 12 }}>
              {loadingPhase === 'searching-policy' ? '正在联网搜索政策...' : 'AI 正在生成体检报告...'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              {loadingPhase === 'searching-policy' ? '正在搜索行业政策和补贴信息' : '正在分析匹配结果，生成个性化报告'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } } .spin { animation: spin 1s linear infinite; }`}</style>
          </div>
        )}

        {/* Report */}
        {step === 'report' && report && !loading && (
          <div>
            {/* Report Header */}
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)', padding: '28px 32px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Shield size={22} style={{ color: '#c8a951' }} />
                      <span style={{ fontWeight: 700, fontSize: 18 }}>企业政策体检报告</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>企业：{report.company}</span>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>行业：{report.industry}</span>
                      {report.revenue !== '未提供' && <span style={{ fontSize: 13, color: '#94a3b8' }}>营收：{report.revenue}</span>}
                    </div>
                  </div>
                  <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    <RefreshCw size={14} />重新查询
                  </button>
                </div>
              </div>

              <div style={{ padding: '28px 32px' }}>
                {/* Company Profile */}
                {report.companyProfile && (
                  <div style={{ padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))', border: '1px solid rgba(37,99,235,0.12)', marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3a5c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={16} style={{ color: '#2563eb' }} />企业概况</div>
                    <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.9 }}>{report.companyProfile}</p>
                  </div>
                )}

                {/* Summary */}
                <div style={{ padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(200,169,81,0.08), rgba(26,58,92,0.04))', border: '1px solid rgba(200,169,81,0.15)', marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3a5c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={16} style={{ color: '#b45309' }} />AI 分析摘要</div>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.9 }}>{report.summary}</p>
                </div>

                {/* Estimate */}
                <div style={{ padding: '24px', borderRadius: 14, background: 'linear-gradient(135deg, #b45309, #d97706)', color: '#fff', textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>预计可获补贴金额</div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>{report.totalEstimate}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>* 实际金额以政府审批结果为准</div>
                </div>

                {/* Qualifications */}
                {report.qualifications && report.qualifications.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a3a5c', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={18} style={{ color: '#2563eb' }} />企业资质体检
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                      {report.qualifications.map((q, i) => {
                        const qs = getQualStatus(q.status)
                        return (
                          <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{qs.icon}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{q.name}</div>
                              <div style={{ fontSize: 12, color: qs.color }}>{q.status}{q.note ? ` · ${q.note}` : ''}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Policy Items - Grouped */}
                {(() => {
                  const groups = groupItems(report.items)
                  return (
                    <div style={{ marginBottom: 28 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a3a5c', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Target size={18} style={{ color: '#b45309' }} />匹配政策列表
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>({report.items.length} 项)</span>
                      </h3>

                      {/* Recommended */}
                      {groups.rec.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 10, padding: '6px 12px', background: '#dcfce7', borderRadius: 8, display: 'inline-block' }}>🔥 强烈推荐</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{groups.rec.map((item, i) => <PolicyCard key={i} item={item} idx={i} getMatchColor={getMatchColor} getDiffStyle={getDiffStyle} getCategoryStyle={getCategoryStyle} condStatus={condStatus} />)}</div>
                        </div>
                      )}

                      {/* Normal */}
                      {groups.normal.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10, padding: '6px 12px', background: '#fffbeb', borderRadius: 8, display: 'inline-block' }}>📋 可申报政策</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{groups.normal.map((item, i) => <PolicyCard key={i} item={item} idx={groups.rec.length + i} getMatchColor={getMatchColor} getDiffStyle={getDiffStyle} getCategoryStyle={getCategoryStyle} condStatus={condStatus} />)}</div>
                        </div>
                      )}

                      {/* Potential */}
                      {groups.pot.length > 0 && (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10, padding: '6px 12px', background: '#f0f4f8', borderRadius: 8, display: 'inline-block' }}>💡 潜力政策（补充条件后可申报）</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{groups.pot.map((item, i) => <PolicyCard key={i} item={item} idx={groups.rec.length + groups.normal.length + i} getMatchColor={getMatchColor} getDiffStyle={getDiffStyle} getCategoryStyle={getCategoryStyle} condStatus={condStatus} />)}</div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Recommendations */}
                {report.recommendations && report.recommendations.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a3a5c', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Lightbulb size={18} style={{ color: '#eab308' }} />提升建议
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {report.recommendations.map((r, i) => (
                        <div key={i} style={{ padding: '16px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #fffbeb, #fef9c3)', border: '1px solid #fde68a' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 6 }}>{r.name}</div>
                          <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.7, marginBottom: 6 }}>{r.detail}</div>
                          {r.impact && <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>💰 {r.impact}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources */}
                {report.sources && report.sources.length > 0 && (
                  <div style={{ padding: '16px 20px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={13} />信息来源（联网搜索）</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {report.sources.slice(0, 5).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#1a3a5c', marginBottom: 12 }}>想要获取详细的申报方案？</h3>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
                以上结果由 AI 联网搜索企业信息与最新政策并智能匹配生成，仅供参考。<br />联系我们的专家，获取一对一免费咨询和定制化申报方案。
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #b45309, #d97706)', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 20px rgba(180,83,9,0.3)' }}>
                  免费咨询专家 <ArrowRight size={16} />
                </Link>
                <a href="tel:19912123125" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, border: '2px solid #1a3a5c', color: '#1a3a5c', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                  <Phone size={16} />19912123125
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Single Policy Card Component
function PolicyCard({ item, idx, getMatchColor, getDiffStyle, getCategoryStyle, condStatus }: {
  item: ReportItem; idx: number;
  getMatchColor: (m: string) => { bg: string; text: string };
  getDiffStyle: (d: string) => { text: string; bg: string; color: string };
  getCategoryStyle: (c: string) => { text: string; bg: string; color: string };
  condStatus: (s: string) => { bg: string; color: string; text: string };
}) {
  const mc = getMatchColor(item.match)
  const diff = getDiffStyle(item.difficulty)
  const cat = getCategoryStyle(item.category || '')

  return (
    <div style={{ padding: 18, borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{idx + 1}. {item.name}</h4>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>{item.description}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, background: mc.bg, color: mc.text, fontSize: 13, fontWeight: 700 }}>匹配度 {item.match}</span>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: diff.bg, color: diff.color, fontSize: 11, fontWeight: 600 }}>难度：{diff.text}</span>
        </div>
      </div>

      {/* Category + Deadline + Subsidy row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: item.reason || item.conditions ? 10 : 0 }}>
        <span style={{ padding: '3px 10px', borderRadius: 6, background: cat.bg, color: cat.color, fontSize: 12, fontWeight: 600 }}>{cat.text}</span>
        {item.deadline && (
          <span style={{ padding: '3px 10px', borderRadius: 6, background: '#f0f4f8', color: '#64748b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />{item.deadline}
          </span>
        )}
        <span style={{ padding: '3px 10px', borderRadius: 6, background: '#f0f4f8', color: '#1a3a5c', fontSize: 12, fontWeight: 600 }}>预计补贴：{item.subsidy}</span>
      </div>

      {/* Reason */}
      {item.reason && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: item.conditions?.length ? 10 : 0, fontSize: 13, color: '#166534', lineHeight: 1.7 }}>
          ✓ {item.reason}
        </div>
      )}

      {/* Conditions */}
      {item.conditions && item.conditions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {item.conditions.map((c, ci) => {
            const cs = condStatus(c.status)
            return (
              <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: cs.bg, color: cs.color, fontWeight: 600, fontSize: 11 }}>{cs.text}</span>
                <span style={{ color: '#334155' }}>{c.name}</span>
                {c.note && <span style={{ color: '#94a3b8' }}>· {c.note}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
