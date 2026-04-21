import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Building2, FileText, ShieldCheck, Star, ArrowRight, Loader2, ClipboardList, UserPlus, ArrowLeft, KeyRound
} from 'lucide-react';

import projectDataJson from '../data/project_data.json';

// 飞书数据获取 — 自动适配本地开发和 Netlify 部署环境
const fetchFeishuRecords = async (): Promise<any[]> => {
  const apiUrl = import.meta.env.DEV
    ? '/feishu-api/proxy/records'
    : '/.netlify/functions/feishu-proxy';

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

const formatDate = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'number') {
    // 飞书日期字段返回的是毫秒时间戳
    if (field > 1e12) {
      const d = new Date(field);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return String(field);
  }
  if (typeof field === 'string') {
    // 如果已经是可读日期格式就直接返回
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(field)) return field;
    // 尝试解析时间戳字符串
    const num = Number(field);
    if (!isNaN(num) && num > 1e12) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return field;
  }
  // 飞书日期对象可能的结构 { timestamp: 1735689600000 }
  if (field.timestamp) {
    const d = new Date(field.timestamp);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return String(field);
};

const extractNumber = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'number') return String(field);
  if (typeof field === 'string') return field;
  return '';
};

type ProjectItem = {
  project: string;
  stage: string;
  manager: string;
  contract_amount: string | null;
  received_amount: string | null;
  pending_amount: string | null;
  year: string | null;
  cert_expiry: string | null;
  latest_record: string | null;
  remark: string | null;
};

const projectData: Record<string, ProjectItem[]> = projectDataJson as any;

const getStageStyle = (stage: string) => {
  if (!stage) return { bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' };
  if (stage.includes('已通过') || stage.includes('补贴')) return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
  if (stage.includes('终止')) return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' };
  if (stage.includes('编写中') || stage.includes('收集中')) return { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' };
  if (stage.includes('已申报')) return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
  if (stage.includes('已结单')) return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  if (stage.includes('意向') || stage.includes('可推')) return { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe' };
  return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
};

const features = [
  {
    icon: <Building2 size={32} />,
    title: '公司检索',
    desc: '输入公司名称，快速匹配并定位专利年费和项目进度数据'
  },
  {
    icon: <FileText size={32} />,
    title: '年费明细',
    desc: '展示每项专利的到期日、缴费金额及通知状态'
  },
  {
    icon: <ClipboardList size={32} />,
    title: '项目进度',
    desc: '查看所有申报项目的进度、客户管家和最新动态'
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
  const [pendingCompany, setPendingCompany] = useState<string | null>(null); // 等待密码验证的公司
  const [password, setPassword] = useState('');
  const [_authVerified, setAuthVerified] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // 注册相关
  const [showRegister, setShowRegister] = useState(false);
  const [regCompany, setRegCompany] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  // 修改密码相关
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [cpCompany, setCpCompany] = useState('');
  const [cpOldPwd, setCpOldPwd] = useState('');
  const [cpNewPwd, setCpNewPwd] = useState('');
  const [cpConfirmPwd, setCpConfirmPwd] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [patentPage, setPatentPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'patent' | 'project'>('patent');
  const patentPerPage = 5;
  const projectPerPage = 10;

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

  React.useEffect(() => {
    if (searchTerm.trim() && !recordsLoaded && !loading) {
      loadRecords();
    }
  }, [searchTerm, recordsLoaded, loading, loadRecords]);

  // 合并年费公司名 + 项目台账公司名
  const companySet = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      const name = extractFieldValue(r.fields['公司名称']);
      if (name) set.add(name);
    });
    Object.keys(projectData).forEach(name => {
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return companySet.filter(c => c.toLowerCase().includes(term));
  }, [searchTerm, companySet]);

  // 年费数据
  const companyPatents = useMemo(() => {
    if (!selectedCompany || !allRecords.length) return [];
    return allRecords
      .filter(r => extractFieldValue(r.fields['公司名称']) === selectedCompany)
      .map(r => ({
        '专利号': extractFieldValue(r.fields['专利号']),
        '专利名称': extractFieldValue(r.fields['专利名称']),
        '年费到期日': formatDate(r.fields['年费到期日']),
        '缴费金额': extractNumber(r.fields['缴费金额']),
        '通知状态': extractFieldValue(r.fields['通知状态']),
        '缴费截止日': formatDate(r.fields['缴费截止日']),
      }));
  }, [selectedCompany, allRecords]);

  // 项目数据
  const companyProjects = useMemo(() => {
    if (!selectedCompany) return [];
    // 精确匹配
    if (projectData[selectedCompany]) return projectData[selectedCompany];
    // 模糊匹配
    for (const key of Object.keys(projectData)) {
      if (key === selectedCompany) return projectData[key];
    }
    return [];
  }, [selectedCompany]);

  const patentTotalPages = Math.ceil(companyPatents.length / patentPerPage) || 1;
  const patentStart = (patentPage - 1) * patentPerPage;
  const patentEnd = patentStart + patentPerPage;
  const currentPatents = companyPatents.slice(patentStart, patentEnd);

  const projectTotalPages = Math.ceil(companyProjects.length / projectPerPage) || 1;
  const projectStart = (projectPage - 1) * projectPerPage;
  const projectEnd = projectStart + projectPerPage;
  const currentProjects = companyProjects.slice(projectStart, projectEnd);

  const notified = companyPatents.filter(p => p['通知状态'] === '已通知').length;
  const pendingNotif = companyPatents.filter(p => p['通知状态'] === '待通知').length;
  const noNeed = companyPatents.filter(p => p['通知状态'] === '无需通知').length;

  // 密码验证
  const handleVerifyPassword = async () => {
    if (!pendingCompany || !password.trim()) { setAuthError('请输入密码'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/.netlify/functions/client-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', companyName: pendingCompany, password: password.trim() }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setAuthVerified(true);
        setSelectedCompany(pendingCompany);
        setShowResults(true);
        setPatentPage(1);
        setProjectPage(1);
        setActiveTab('patent');
        if (!recordsLoaded) await loadRecords();
        setPendingCompany(null);
        setPassword('');
        setTimeout(() => {
          const el = document.getElementById('search-results');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        setAuthError(data.msg || '验证失败');
      }
    } catch {
      setAuthError('网络错误，请稍后重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSearch = async (company: string) => {
    // 先弹出密码框
    setPendingCompany(company);
    setPassword('');
    setAuthError('');
    setAuthVerified(false);
  };

  // 注册
  const handleRegister = async () => {
    const company = regCompany.trim();
    const pwd = regPassword.trim();
    const confirm = regConfirm.trim();
    if (!company) { setRegError('请输入企业名称'); return; }
    // 企业名称校验：必须包含"公司""有限""集团""大学""医院"等关键词
    const validNamePattern = /公司|有限|集团|企业|大学|学院|医院|研究所|研究院|中心|事务所|合伙/;
    if (!validNamePattern.test(company)) {
      setRegError('请输入合规的企业全称（需包含"公司""有限""集团"等关键词）');
      return;
    }
    if (!pwd) { setRegError('请输入密码'); return; }
    if (pwd.length < 6) { setRegError('密码长度不能少于6位'); return; }
    if (pwd !== confirm) { setRegError('两次输入的密码不一致'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      const res = await fetch('/.netlify/functions/client-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', companyName: company, password: pwd }),
      });
      const data = await res.json();
      if (data.code === 0) {
        // 注册成功，自动切到登录
        setRegCompany('');
        setRegPassword('');
        setRegConfirm('');
        setShowRegister(false);
        setPendingCompany(company);
        setPassword('');
        setAuthError('');
        setAuthVerified(false);
      } else {
        setRegError(data.msg || '注册失败');
      }
    } catch {
      setRegError('网络错误，请稍后重试');
    } finally {
      setRegLoading(false);
    }
  };

  const openRegister = () => {
    setPendingCompany(null);
    setShowRegister(true);
    setRegError('');
    setRegCompany('');
    setRegPassword('');
    setRegConfirm('');
  };

  const closeRegister = () => {
    setShowRegister(false);
    setRegError('');
    setRegCompany('');
    setRegPassword('');
    setRegConfirm('');
  };

  // 修改密码
  const handleChangePwd = async () => {
    const company = cpCompany.trim();
    const oldPwd = cpOldPwd.trim();
    const newPwd = cpNewPwd.trim();
    const confirm = cpConfirmPwd.trim();
    if (!company) { setCpError('请输入公司名称'); return; }
    if (!oldPwd) { setCpError('请输入原密码'); return; }
    if (!newPwd) { setCpError('请输入新密码'); return; }
    if (newPwd.length < 6) { setCpError('新密码长度不能少于6位'); return; }
    if (newPwd !== confirm) { setCpError('两次输入的新密码不一致'); return; }
    setCpLoading(true);
    setCpError('');
    try {
      const res = await fetch('/.netlify/functions/client-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', companyName: company, oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShowChangePwd(false);
        setCpCompany(''); setCpOldPwd(''); setCpNewPwd(''); setCpConfirmPwd('');
        setCpError('');
      } else {
        setCpError(data.msg || '修改失败');
      }
    } catch {
      setCpError('网络错误，请稍后重试');
    } finally {
      setCpLoading(false);
    }
  };

  const openChangePwd = () => {
    setShowChangePwd(true);
    setCpError('');
    setCpCompany(pendingCompany || '');
    setCpOldPwd(''); setCpNewPwd(''); setCpConfirmPwd('');
  };

  const closeChangePwd = () => {
    setShowChangePwd(false);
    setCpError('');
    setCpCompany(''); setCpOldPwd(''); setCpNewPwd(''); setCpConfirmPwd('');
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCompany(null);
    setPendingCompany(null);
    setPassword('');
    setAuthVerified(false);
    setAuthError('');
    setShowResults(false);
    setPatentPage(1);
    setProjectPage(1);
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

  // 分页组件
  const Pagination = ({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) => {
    if (total <= 1) return null;
    return (
      <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>第 {current} / {total} 页</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onChange(current - 1)} disabled={current === 1} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: current === 1 ? '#f1f5f9' : '#e2e8f0', color: current === 1 ? '#cbd5e1' : '#475569' }}>上一页</button>
          {Array.from({ length: Math.min(total, 7) }, (_, i) => {
            let page: number;
            if (total <= 7) {
              page = i + 1;
            } else if (current <= 4) {
              page = i + 1;
            } else if (current >= total - 3) {
              page = total - 6 + i;
            } else {
              page = current - 3 + i;
            }
            return (
              <button key={page} onClick={() => onChange(page)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: current === page ? '#1a3a5c' : '#e2e8f0', color: current === page ? '#fff' : '#475569', minWidth: 36 }}>{page}</button>
            );
          })}
          <button onClick={() => onChange(current + 1)} disabled={current === total} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: current === total ? '#f1f5f9' : '#e2e8f0', color: current === total ? '#cbd5e1' : '#475569' }}>下一页</button>
        </div>
      </div>
    );
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
                客户服务中心<br />
                <span style={{ color: '#c8a951' }}>年费 & 项目查询</span>
              </h1>
              <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.9, marginBottom: 36, maxWidth: 500 }}>
                一键搜索公司名称，即可查看专利年费到期情况和项目申报进度。数据从飞书表格实时获取，修改即时生效。
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

      {/* 密码验证弹窗 */}
      {pendingCompany && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <ShieldCheck size={28} color="#1a3a5c" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: 4 }}>身份验证</h3>
              <p style={{ fontSize: 14, color: '#64748b' }}>
                请输入 <span style={{ fontWeight: 600, color: '#1a3a5c' }}>{pendingCompany}</span> 的访问密码
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>公司名称</label>
              <div style={{
                width: '100%', padding: '10px 14px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#64748b',
              }}>
                {pendingCompany}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                placeholder="请输入密码"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#1a3a5c'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            {authError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16,
              }}>
                {authError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setPendingCompany(null); setPassword(''); setAuthError(''); }}
                style={{
                  flex: 1, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#475569',
                }}
              >
                返回
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={authLoading}
                style={{
                  flex: 1, padding: 12, border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: authLoading ? 'not-allowed' : 'pointer',
                  background: authLoading ? '#93c5fd' : '#1a3a5c', color: '#fff',
                }}
              >
                {authLoading ? '验证中...' : '查看数据'}
              </button>
            </div>

            {/* 注册 & 修改密码入口 */}
            <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>没有账号？</span>
                <button
                  onClick={openRegister}
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#1a3a5c', background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                    padding: 0, marginLeft: 4,
                  }}
                >
                  立即注册
                </button>
              </div>
              <div>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>忘记密码？</span>
                <button
                  onClick={openChangePwd}
                  style={{
                    fontSize: 13, fontWeight: 600, color: '#b45309', background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                    padding: 0, marginLeft: 4,
                  }}
                >
                  修改密码
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 注册弹窗 */}
      {showRegister && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <UserPlus size={28} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: 4 }}>客户注册</h3>
              <p style={{ fontSize: 14, color: '#64748b' }}>输入企业全称和密码完成注册</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>企业全称</label>
              <input
                type="text"
                value={regCompany}
                onChange={(e) => setRegCompany(e.target.value)}
                placeholder="例如：保定开拓精密仪器制造有限责任公司"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>设置密码</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="至少6位"
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>确认密码</label>
              <input
                type="password"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                placeholder="再次输入密码"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            {regError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14,
              }}>
                {regError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                onClick={closeRegister}
                style={{
                  flex: 1, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ArrowLeft size={16} /> 返回
              </button>
              <button
                onClick={handleRegister}
                disabled={regLoading}
                style={{
                  flex: 1, padding: 12, border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: regLoading ? 'not-allowed' : 'pointer',
                  background: regLoading ? '#86efac' : '#16a34a', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {regLoading ? '注册中...' : <><UserPlus size={16} /> 注册</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showChangePwd && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#fffbeb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <KeyRound size={28} color="#b45309" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: 4 }}>修改密码</h3>
              <p style={{ fontSize: 14, color: '#64748b' }}>验证原密码后设置新密码</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>公司名称</label>
              {cpCompany ? (
                <div style={{
                  padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 14, background: '#f8fafc', color: '#1a3a5c', fontWeight: 500,
                  boxSizing: 'border-box',
                }}>
                  {cpCompany}
                </div>
              ) : (
                <input
                  type="text"
                  value={cpCompany}
                  onChange={(e) => setCpCompany(e.target.value)}
                  placeholder="输入注册时的企业名称"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#b45309'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>原密码</label>
              <input
                type="password"
                value={cpOldPwd}
                onChange={(e) => setCpOldPwd(e.target.value)}
                placeholder="输入当前密码"
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#b45309'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>新密码</label>
              <input
                type="password"
                value={cpNewPwd}
                onChange={(e) => setCpNewPwd(e.target.value)}
                placeholder="至少6位"
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#b45309'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>确认新密码</label>
              <input
                type="password"
                value={cpConfirmPwd}
                onChange={(e) => setCpConfirmPwd(e.target.value)}
                placeholder="再次输入新密码"
                onKeyDown={(e) => e.key === 'Enter' && handleChangePwd()}
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#b45309'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            {cpError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 12,
              }}>
                {cpError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                onClick={closeChangePwd}
                style={{
                  flex: 1, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', background: '#fff', color: '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ArrowLeft size={16} /> 返回
              </button>
              <button
                onClick={handleChangePwd}
                disabled={cpLoading}
                style={{
                  flex: 1, padding: 12, border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: cpLoading ? 'not-allowed' : 'pointer',
                  background: cpLoading ? '#fde68a' : '#b45309', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {cpLoading ? '修改中...' : <><KeyRound size={16} /> 修改密码</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索结果区域 */}
      {showResults && (companyPatents.length > 0 || companyProjects.length > 0) && (
        <section id="search-results" style={{ background: '#f8fafc', padding: '80px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <h2 className="section-title">{selectedCompany}</h2>
            <div className="divider" />
            <p className="section-sub">客户数据概览（数据来自飞书表格）</p>

            {/* 统计卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40, marginTop: 36 }} className="stats-grid">
              {[
                { num: companyPatents.length, label: '专利总数', color: '#1a3a5c' },
                { num: companyProjects.length, label: '项目总数', color: '#7c3aed' },
                { num: notified, label: '已通知', color: '#16a34a' },
                { num: pendingNotif, label: '待通知', color: '#ca8a04' },
                { num: noNeed, label: '无需通知', color: '#64748b' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tab 切换 */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
              <button
                onClick={() => setActiveTab('patent')}
                style={{
                  padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  border: 'none', borderTopLeftRadius: 12,
                  background: activeTab === 'patent' ? '#1a3a5c' : '#e2e8f0',
                  color: activeTab === 'patent' ? '#fff' : '#64748b',
                }}
              >
                <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                专利年费 ({companyPatents.length})
              </button>
              <button
                onClick={() => setActiveTab('project')}
                style={{
                  padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  border: 'none', borderTopRightRadius: 12,
                  background: activeTab === 'project' ? '#7c3aed' : '#e2e8f0',
                  color: activeTab === 'project' ? '#fff' : '#64748b',
                }}
              >
                <ClipboardList size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                项目进度 ({companyProjects.length})
              </button>
            </div>

            {/* 年费表格 */}
            {activeTab === 'patent' && (
              <div style={{ background: '#fff', borderRadius: '0 16px 16px 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                <div style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>专利年费明细</h3>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>共 {companyPatents.length} 条记录</span>
                  </div>
                  <button onClick={handleReset} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                          <tr key={index} style={{ borderBottom: index < currentPatents.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{patent['专利号']}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', maxWidth: 240 }}>{patent['专利名称']}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569' }}>{patent['年费到期日'] || '-'}</td>
                            <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: patent['缴费金额'] ? '#1e293b' : '#94a3b8' }}>{patent['缴费金额'] ? '¥' + patent['缴费金额'] : '-'}</td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color, border: '1px solid ' + statusStyle.border }}>
                                {patent['通知状态'] || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569' }}>{patent['缴费截止日'] || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination current={patentPage} total={patentTotalPages} onChange={setPatentPage} />
                <div style={{ padding: '12px 28px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: '已通知', desc: '提醒已发送给客户', color: '#16a34a' },
                    { label: '待通知', desc: '即将到期，待发送提醒', color: '#ca8a04' },
                    { label: '无需通知', desc: '无年费或已缴费', color: '#64748b' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#1e293b' }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>- {item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 项目表格 */}
            {activeTab === 'project' && (
              <div style={{ background: '#fff', borderRadius: '0 16px 16px 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>项目申报进度</h3>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>共 {companyProjects.length} 个项目</span>
                  </div>
                  <button onClick={handleReset} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    重新搜索 <ArrowRight size={14} />
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#faf5ff' }}>
                        {['项目名称', '项目阶段', '申报年份', '客户管家', '合同金额', '收款金额', '待收款', '证书有效期'].map(h => (
                          <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e9d5ff' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentProjects.map((proj, index) => {
                        const stageStyle = getStageStyle(proj.stage || '');
                        return (
                          <tr key={index} style={{ borderBottom: index < currentProjects.length - 1 ? '1px solid #f5f3ff' : 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#faf5ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: '#1e293b', maxWidth: 220 }}>{proj.project || '-'}</td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: stageStyle.bg, color: stageStyle.color, border: '1px solid ' + stageStyle.border }}>
                                {proj.stage || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>{proj.year || '-'}</td>
                            <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569', fontWeight: 500 }}>{proj.manager || '-'}</td>
                            <td style={{ padding: '14px 18px', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{proj.contract_amount || '-'}</td>
                            <td style={{ padding: '14px 18px', fontSize: 13, color: '#16a34a', fontWeight: 500 }}>{proj.received_amount || '-'}</td>
                            <td style={{ padding: '14px 18px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{proj.pending_amount || '-'}</td>
                            <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>{proj.cert_expiry || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination current={projectPage} total={projectTotalPages} onChange={setProjectPage} />
                <div style={{ padding: '12px 28px 16px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: '已通过/补贴', desc: '项目已完成', color: '#16a34a' },
                    { label: '编写中/收集中', desc: '正在进行', color: '#1e40af' },
                    { label: '已申报', desc: '等待结果', color: '#92400e' },
                    { label: '已终止', desc: '项目停止', color: '#991b1b' },
                    { label: '意向/可推', desc: '潜在业务', color: '#5b21b6' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#1e293b' }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>- {item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <style>{`@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
        </section>
      )}

      {/* 搜索了但两家表都没数据 */}
      {showResults && companyPatents.length === 0 && companyProjects.length === 0 && !loading && (
        <section id="search-results" style={{ background: '#f8fafc', padding: '80px 0', textAlign: 'center' }}>
          <Building2 size={48} style={{ color: '#94a3b8', margin: '0 auto 16px' }} />
          <p style={{ color: '#475569', fontSize: 16 }}>暂无 "{selectedCompany}" 的数据</p>
          <button onClick={handleReset} style={{ marginTop: 16, padding: '10px 24px', background: '#1a3a5c', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>重新搜索</button>
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
            <p className="section-sub">简单三步，轻松查询企业数据</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 28, marginTop: 36 }}>
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
            <a href="tel:19912123125" className="btn-outline">电话：19912123125</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClientCenterNoLayout;
