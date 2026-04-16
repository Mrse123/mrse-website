import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Building2, FileText, ShieldCheck, Star, ArrowRight, Loader2
} from 'lucide-react';

// 飞书数据获取 — 自动适配本地开发和 Netlify 部署环境
const fetchFeishuRecords = async (): Promise<any[]> => {
  // 生产环境走 Netlify Function（服务端代理，AppSecret 安全）
  const apiUrl = import.meta.env.DEV
    ? '/feishu-api/proxy/records'  // 开发环境：Vite proxy 转发
    : '/.netlify/functions/feishu-proxy';  // 生产环境：Netlify Function

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error('请求失败: ' + res.status);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || '数据加载失败');
  return data.data;
};

const extractFieldValue = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.map((item: any) => (typeof item === 'string' ? item : item.text || item.name || '')).join(', ');
  }
  if (field.text) return field.text;
  if (field.name) return field.name;
  if (field.link) return field.link;
  return String(field);
};

const extractNumber = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'number') return String(field);
  if (typeof field === 'string') return field;
  return '';
};

const features = [
  {
    icon: <Building2 size={32} />,
    title: '公司检索',
    desc: '输入公司名称，快速匹配并定位专利年费数据'
  },
  {
    icon: <FileText size={32} />,
    title: '年费明细',
    desc: '展示每项专利的到期日、缴费金额及通知状态'
  },
  {
    icon: <ShieldCheck size={32} />,
    title: '实时同步',
    desc: '数据直接从飞书表格获取，修改即时生效'
  }
];

const ClientCenterNoLayout = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [error, setError] = useState('');
  const itemsPerPage = 5;

  // 加载全部数据（输入搜索词时自动触发）
  const loadRecords = useCallback(async () => {
    if (recordsLoaded || loading) return;
    setLoading(true);
    setError('');
    try {
      const records = await fetchFeishuRecords();
      setAllRecords(records);
      setRecordsLoaded(true);
    } catch (e: any) {
      setError(e.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [recordsLoaded, loading]);

  // 当搜索词变化时自动加载数据
  React.useEffect(() => {
    if (searchTerm.trim() && !recordsLoaded && !loading) {
      loadRecords();
    }
  }, [searchTerm, recordsLoaded, loading, loadRecords]);

  // 从全部记录中提取公司列表
  const companySet = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      const name = extractFieldValue(r.fields['公司名称']);
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  // 模糊搜索公司
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return companySet.filter(c => c.toLowerCase().includes(term));
  }, [searchTerm, companySet]);

  // 选中公司的专利记录
  const companyPatents = useMemo(() => {
    if (!selectedCompany || !allRecords.length) return [];
    return allRecords
      .filter(r => extractFieldValue(r.fields['公司名称']) === selectedCompany)
      .map(r => ({
        '专利号': extractFieldValue(r.fields['专利号']),
        '专利名称': extractFieldValue(r.fields['专利名称']),
        '年费到期日': extractFieldValue(r.fields['年费到期日']),
        '缴费金额': extractNumber(r.fields['缴费金额']),
        '通知状态': extractFieldValue(r.fields['通知状态']),
        '缴费截止日': extractFieldValue(r.fields['缴费截止日']),
      }));
  }, [selectedCompany, allRecords]);

  const totalPages = Math.ceil(companyPatents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatents = companyPatents.slice(startIndex, endIndex);

  const notified = companyPatents.filter(p => p['通知状态'] === '已通知').length;
  const pending = companyPatents.filter(p => p['通知状态'] === '待通知').length;
  const noNeed = companyPatents.filter(p => p['通知状态'] === '无需通知').length;

  const handleSearch = async (company: string) => {
    setSelectedCompany(company);
    setShowResults(true);
    setCurrentPage(1);
    if (!recordsLoaded) {
      await loadRecords();
    }
    setTimeout(() => {
      const el = document.getElementById('search-results');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCompany(null);
    setShowResults(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '已通知': return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
      case '待通知': return { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' };
      case '无需通知': return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
      case '任务已分配': return { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' };
      default: return { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' };
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #1d4ed8 100%)',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '100px 0 80px',
      }}>
        <div style={{ position: 'absolute', right: -100, top: -100, width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 150, top: 50, width: 250, height: 250, borderRadius: '50%', background: 'rgba(200,169,81,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -80, bottom: -80, width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="hero-grid">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,169,81,0.15)', border: '1px solid rgba(200,169,81,0.3)', padding: '6px 16px', borderRadius: 20, marginBottom: 24 }}>
                <Star size={14} style={{ color: '#c8a951' }} />
                <span style={{ color: '#c8a951', fontSize: 13, fontWeight: 500 }}>数据实时同步 · 飞书直连</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 20 }}>
                专利年费<br />
                <span style={{ color: '#c8a951' }}>智能监控系统</span>
              </h1>
              <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9, marginBottom: 36, maxWidth: 500 }}>
                一键搜索公司名称，即可查看专利年费到期情况。数据从飞书表格实时获取，修改即时生效，无需手动同步。
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Link to="/services" className="btn-primary">了解服务</Link>
                <Link to="/contact" className="btn-outline">联系咨询</Link>
              </div>
            </div>

            {/* 右侧搜索面板 */}
            <div style={{ display: 'flex', justifyContent: 'center' }} className="hero-right">
              <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420 }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
                  <Search size={18} style={{ verticalAlign: 'middle', marginRight: 8, color: '#c8a951' }} />
                  搜索公司
                </h3>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="输入公司名称..."
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', marginBottom: 16 }}
                />

                {loading && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#c8a951' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle', marginRight: 8 }} />
                    正在从飞书加载数据...
                  </div>
                )}

                {error && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#fca5a5', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                {!loading && filteredCompanies.length > 0 && (
                  <div style={{ maxHeight: 240, overflowY: 'auto', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 12 }}>
                    {filteredCompanies.slice(0, 8).map((company, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(company)}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: 'none', borderBottom: index < filteredCompanies.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,169,81,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      >
                        <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: 8, color: '#c8a951' }} />
                        {company}
                      </button>
                    ))}
                  </div>
                )}

                {!loading && searchTerm && filteredCompanies.length === 0 && !error && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
                    未找到匹配的公司
                  </div>
                )}

                {selectedCompany && (
                  <button onClick={handleReset} style={{ width: '100%', padding: '10px', marginTop: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                    重新搜索
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; } }
        `}</style>
      </section>

      {/* 搜索结果区域 */}
      {showResults && companyPatents.length > 0 && (
        <section id="search-results" style={{ background: '#f8fafc', padding: '80px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <h2 className="section-title">专利年费详情</h2>
            <div className="divider" />
            <p className="section-sub">{selectedCompany} 的专利年费管理概览（数据来自飞书表格）</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40, marginTop: 36 }} className="stats-grid">
              {[
                { num: companyPatents.length, label: '专利总数', color: '#1a3a5c' },
                { num: notified, label: '已通知', color: '#16a34a' },
                { num: pending, label: '待通知', color: '#ca8a04' },
                { num: noNeed, label: '无需通知', color: '#64748b' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
              <div style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{selectedCompany}</h3>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>第 {currentPage} / {totalPages} 页，共 {companyPatents.length} 条记录</span>
                </div>
                <button onClick={handleReset} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  重新搜索 <ArrowRight size={14} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['专利号', '专利名称', '年费到期日', '缴费金额', '通知状态', '缴费截止日'].map(h => (
                        <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentPatents.map((patent, index) => {
                      const statusStyle = getStatusStyle(patent['通知状态']);
                      return (
                        <tr key={index} style={{ borderBottom: index < currentPatents.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{patent['专利号']}</td>
                          <td style={{ padding: '16px 20px', fontSize: 14, color: '#475569', maxWidth: 280 }}>{patent['专利名称']}</td>
                          <td style={{ padding: '16px 20px', fontSize: 14, color: '#475569' }}>{patent['年费到期日'] || '-'}</td>
                          <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: patent['缴费金额'] ? '#1e293b' : '#94a3b8' }}>{patent['缴费金额'] ? '\u00A5' + patent['缴费金额'] : '-'}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color, border: '1px solid ' + statusStyle.border }}>
                              {patent['通知状态'] || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 14, color: '#475569' }}>{patent['缴费截止日'] || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>显示第 {startIndex + 1}-{Math.min(endIndex, companyPatents.length)} 条</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: currentPage === 1 ? '#f1f5f9' : '#e2e8f0', color: currentPage === 1 ? '#cbd5e1' : '#475569' }}>上一页</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} onClick={() => handlePageChange(page)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: currentPage === page ? '#1a3a5c' : '#e2e8f0', color: currentPage === page ? '#fff' : '#475569', minWidth: 36 }}>{page}</button>
                    ))}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: currentPage === totalPages ? '#f1f5f9' : '#e2e8f0', color: currentPage === totalPages ? '#cbd5e1' : '#475569' }}>下一页</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: '已通知', desc: '提醒已发送给客户', color: '#16a34a' },
                { label: '待通知', desc: '即将到期，待发送提醒', color: '#ca8a04' },
                { label: '无需通知', desc: '无年费或已缴费', color: '#64748b' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>- {item.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <style>{`@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
        </section>
      )}

      {/* 加载中 */}
      {showResults && loading && (
        <section id="search-results" style={{ background: '#f8fafc', padding: '80px 0', textAlign: 'center' }}>
          <Loader2 size={40} style={{ color: '#1a3a5c', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: 16 }}>正在从飞书表格加载数据...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </section>
      )}

      {/* 错误提示 */}
      {showResults && error && (
        <section id="search-results" style={{ background: '#f8fafc', padding: '80px 0', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: 16 }}>{error}</p>
          <button onClick={() => { setRecordsLoaded(false); loadRecords(); }} style={{ marginTop: 16, padding: '8px 20px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>重试</button>
        </section>
      )}

      {/* 使用指南 */}
      {!showResults && (
        <section style={{ background: '#f8fafc', padding: '80px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <h2 className="section-title">使用指南</h2>
            <div className="divider" />
            <p className="section-sub">简单三步，轻松管理专利年费</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, marginTop: 36 }}>
              {features.map((f, i) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #1a3a5c, #2563a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#c8a951' }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: '#1a3a5c', marginBottom: 12 }}>{f.title}</h3>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section style={{ background: 'linear-gradient(135deg, #0f2540, #1a3a5c)', padding: '80px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <ShieldCheck size={48} style={{ color: '#c8a951', margin: '0 auto 20px' }} />
          <h2 style={{ color: '#fff', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>需要专业的知识产权服务？</h2>
          <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 36, lineHeight: 1.8 }}>
            玛仕知产提供专利申请、商标注册、高新认定等全方位服务。<br />
            专业团队，48小时内响应，为您的企业创新保驾护航。
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary">立即免费咨询</Link>
            <a href="tel:0312-12345678" className="btn-outline">电话：0312-12345678</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClientCenterNoLayout;
