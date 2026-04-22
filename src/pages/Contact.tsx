import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react'
import { API_BASE } from '../api'

const contactInfo = [
  {
    icon: <MapPin size={24} />,
    title: '公司地址',
    lines: ['保定市恒源西路888号', '3S双创社区孵化楼南侧工业楼A区2号'],
  },
  {
    icon: <Phone size={24} />,
    title: '联系电话',
    lines: ['19912123125', '工作日 9:00 - 18:00'],
  },
  {
    icon: <Mail size={24} />,
    title: '电子邮箱',
    lines: ['13366425856@163.com', '24小时接收您的咨询'],
  },
  {
    icon: <Clock size={24} />,
    title: '服务时间',
    lines: ['周一至周五 9:00-18:00', '紧急事务可拨打客服热线'],
  },
]

const serviceOptions = [
  '专利申请（发明/实用新型/外观）',
  '商标注册代理',
  '版权著作权登记',
  '高新技术企业认定',
  '科技型中小企业评价',
  '省市级项目申报',
  '知识产权战略规划',
  '企业管理咨询',
  '其他服务',
]

export default function Contact() {
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', service: '', message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (data.success) {
        setSubmitted(true)
      } else {
        setError(data.error || '提交失败，请稍后重试')
      }
    } catch {
      setError('网络错误，请检查网络连接后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Page Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 100%)',
        padding: '80px 0 60px', textAlign: 'center'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ fontSize: 13, color: '#c8a951', letterSpacing: 4, marginBottom: 16, fontWeight: 600 }}>CONTACT US</div>
          <h1 style={{ color: '#fff', fontSize: 40, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>联系我们</h1>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9 }}>
            有任何问题或需求，欢迎随时联系我们，专业顾问为您提供专属服务
          </p>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>首页</Link>
            <span style={{ color: '#475569', fontSize: 14 }}>/</span>
            <span style={{ color: '#c8a951', fontSize: 14 }}>联系我们</span>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section style={{ background: '#f8fafc', padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 48, alignItems: 'start' }} className="contact-grid">

            {/* Left: Info */}
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1a3a5c', marginBottom: 8 }}>联系方式</h2>
              <div style={{ width: 40, height: 3, background: '#c8a951', borderRadius: 2, marginBottom: 24 }} />
              <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.9, marginBottom: 36 }}>
                如果您需要了解知识产权服务、高新企业认定或项目申报，欢迎通过以下方式联系我们。我们承诺48小时内给予专业回复。
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {contactInfo.map((info, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    background: '#fff', borderRadius: 12, padding: '20px',
                    boxShadow: '0 2px 12px rgba(26,58,92,0.06)'
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1a3a5c, #2563a8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#c8a951'
                    }}>
                      {info.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1a3a5c', fontSize: 15, marginBottom: 6 }}>{info.title}</div>
                      {info.lines.map((line, j) => (
                        <div key={j} style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>{line}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* QR Code Area */}
              <div style={{
                marginTop: 28, background: '#1a3a5c', borderRadius: 16,
                padding: 24, textAlign: 'center'
              }}>
                <div style={{
                  width: 160, height: 160, borderRadius: 12, margin: '0 auto 12px',
                  overflow: 'hidden', border: '2px solid rgba(200,169,81,0.3)'
                }}>
                  <img src="/wechat-qr.png" alt="微信二维码" style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block'
                  }} />
                </div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>扫码添加微信</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>在线咨询更便捷</div>
              </div>
            </div>

            {/* Right: Form */}
            <div style={{
              background: '#fff', borderRadius: 20,
              padding: 40, boxShadow: '0 8px 40px rgba(26,58,92,0.1)'
            }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c8a951, #e6c96a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <CheckCircle size={40} style={{ color: '#fff' }} />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1a3a5c', marginBottom: 12 }}>提交成功！</h3>
                  <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.8, marginBottom: 28 }}>
                    感谢您的咨询，我们的专业顾问将在48小时内与您联系，请保持电话畅通。
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn-primary"
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    再次咨询
                  </button>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a3a5c', marginBottom: 8 }}>在线咨询</h2>
                  <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>填写以下信息，我们将尽快与您联系</p>

                  {error && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                      padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14
                    }}>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="form-grid">
                      <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                          您的姓名 <span style={{ color: '#e11d48' }}>*</span>
                        </label>
                        <input
                          name="name" value={form.name} onChange={handleChange} required
                          placeholder="请输入姓名"
                          style={{
                            width: '100%', padding: '11px 14px', borderRadius: 8,
                            border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                            transition: 'border-color 0.2s', background: '#f8fafc',
                            boxSizing: 'border-box'
                          }}
                          onFocus={e => e.target.style.borderColor = '#1a3a5c'}
                          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                          联系电话 <span style={{ color: '#e11d48' }}>*</span>
                        </label>
                        <input
                          name="phone" value={form.phone} onChange={handleChange} required
                          placeholder="请输入手机号"
                          style={{
                            width: '100%', padding: '11px 14px', borderRadius: 8,
                            border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                            transition: 'border-color 0.2s', background: '#f8fafc',
                            boxSizing: 'border-box'
                          }}
                          onFocus={e => e.target.style.borderColor = '#1a3a5c'}
                          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        公司名称
                      </label>
                      <input
                        name="company" value={form.company} onChange={handleChange}
                        placeholder="请输入公司名称"
                        style={{
                          width: '100%', padding: '11px 14px', borderRadius: 8,
                          border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                          transition: 'border-color 0.2s', background: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#1a3a5c'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        电子邮箱
                      </label>
                      <input
                        name="email" value={form.email} onChange={handleChange} type="email"
                        placeholder="请输入邮箱地址"
                        style={{
                          width: '100%', padding: '11px 14px', borderRadius: 8,
                          border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                          transition: 'border-color 0.2s', background: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#1a3a5c'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        咨询服务 <span style={{ color: '#e11d48' }}>*</span>
                      </label>
                      <select
                        name="service" value={form.service} onChange={handleChange} required
                        style={{
                          width: '100%', padding: '11px 14px', borderRadius: 8,
                          border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                          background: '#f8fafc', color: form.service ? '#1e293b' : '#9ca3af',
                          boxSizing: 'border-box', cursor: 'pointer'
                        }}
                      >
                        <option value="">请选择您需要的服务</option>
                        {serviceOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: 28 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        详细说明
                      </label>
                      <textarea
                        name="message" value={form.message} onChange={handleChange}
                        rows={4} placeholder="请详细描述您的需求，我们将为您提供更精准的解决方案..."
                        style={{
                          width: '100%', padding: '11px 14px', borderRadius: 8,
                          border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
                          transition: 'border-color 0.2s', background: '#f8fafc',
                          resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                          boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#1a3a5c'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 8, border: 'none',
                        background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #1a3a5c, #2563a8)',
                        color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.3s', letterSpacing: 1
                      }}
                    >
                      <Send size={18} />
                      {submitting ? '提交中...' : '立即提交咨询'}
                    </button>

                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 16 }}>
                      提交即表示您同意我们的隐私政策，我们承诺保护您的个人信息安全
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .contact-grid { grid-template-columns: 1fr !important; }
            .form-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* Map Section */}
      <section style={{ background: '#fff', padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <h2 className="section-title">公司位置</h2>
          <div className="divider" />
          <p className="section-sub">欢迎到访，我们期待与您面谈</p>

          <div style={{
            background: 'linear-gradient(135deg, #f8fafc, #e8f0fe)',
            borderRadius: 20, height: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed #e2e8f0', flexDirection: 'column', gap: 16
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#1a3a5c',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MapPin size={28} style={{ color: '#c8a951' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3a5c', marginBottom: 8 }}>
                河北玛仕知识产权服务有限公司
              </div>
              <div style={{ color: '#64748b', fontSize: 15 }}>
                保定市恒源西路888号3S双创社区孵化楼南侧工业楼A区2号
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                （地图可嵌入百度地图 / 高德地图 API）
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#f8fafc', padding: '80px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <h2 className="section-title">常见问题</h2>
          <div className="divider" />

          {[
            {
              q: '申请专利一般需要多长时间？',
              a: '实用新型专利一般需要6-12个月获得授权；发明专利通常需要2-3年；外观设计专利约3-6个月。我们会全程跟踪进度并及时反馈。'
            },
            {
              q: '高新技术企业认定有哪些基本条件？',
              a: '核心条件包括：企业成立满1年、在中国境内注册、拥有核心知识产权（专利等）、主要产品属于《国家重点支持的高新技术领域》、研发费用占收入比例达标等。具体条件可咨询我们的专业顾问。'
            },
            {
              q: '服务费用如何收取？',
              a: '我们坚持费用透明原则，官方规费部分严格按照国家标准收取，代理服务费根据服务类型和工作量协商确定，签约前明确报价，无任何隐形收费。'
            },
            {
              q: '如果专利申请被驳回怎么办？',
              a: '我们提供驳回应对服务，专业顾问会分析驳回原因，制定答复策略，代为撰写意见陈述书，最大限度争取专利授权。多年经验保障答复质量。'
            },
          ].map((faq, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 12, padding: '24px 28px',
              marginBottom: 16, boxShadow: '0 2px 12px rgba(26,58,92,0.06)',
              borderLeft: '4px solid #c8a951'
            }}>
              <h4 style={{ fontWeight: 700, color: '#1a3a5c', fontSize: 16, marginBottom: 12 }}>
                Q：{faq.q}
              </h4>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.9, margin: 0 }}>
                A：{faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
