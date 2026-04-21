import { useState, useMemo } from 'react';
import Layout from '../components/Layout';

type Step = 'search' | 'password' | 'results';
type FeeRecord = Record<string, any>;

const ClientCenter = () => {
  const [step, setStep] = useState<Step>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feeData, setFeeData] = useState<FeeRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 搜索公司（模糊匹配）
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/client-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', keyword: searchTerm.trim() }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setLoading(false);
        return data.data as string[]; // 返回匹配的公司名列表
      }
      setError(data.msg || '搜索失败');
      return [];
    } catch {
      setError('网络错误，请稍后重试');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 防抖搜索
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useMemo(() => { let t: any; return { set: (v: any) => { clearTimeout(t); t = setTimeout(v, 400); }, clear: () => clearTimeout(t) }; }, []);

  const onSearchChange = (val: string) => {
    setSearchTerm(val);
    searchTimer.clear();
    if (!val.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimer.set(async () => {
      const results = await handleSearch();
      setSearchResults(results || []);
      setIsSearching(false);
    });
  };

  // 选择公司
  const selectCompany = (company: string) => {
    setSelectedCompany(company);
    setSearchResults([]);
    setStep('password');
    setError('');
  };

  // 验证密码并获取数据
  const handleVerify = async () => {
    if (!password.trim()) { setError('请输入密码'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/.netlify/functions/client-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', companyName: selectedCompany, password: password.trim() }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setFeeData(data.data || []);
        setStep('results');
      } else {
        setError(data.msg || '验证失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 重新搜索
  const handleReset = () => {
    setStep('search');
    setSearchTerm('');
    setSelectedCompany('');
    setPassword('');
    setError('');
    setFeeData([]);
    setCurrentPage(1);
    setSearchResults([]);
  };

  // 分页
  const totalPages = Math.ceil(feeData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFees = feeData.slice(startIndex, endIndex);

  // 获取字段的显示名
  const getFieldValue = (record: FeeRecord, fieldName: string): string => {
    const val = record[fieldName];
    if (!val) return '-';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map((v: any) => v.text || v.link || String(v)).join(', ');
    return String(val);
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '已通知': return 'bg-green-100 text-green-800 border-green-200';
      case '待通知': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '无需通知': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取字段列表（从第一条数据推断）
  const fieldNames = feeData.length > 0 ? Object.keys(feeData[0]) : [];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* 标题 */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">🔍 客户年费查询系统</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {step === 'search' && '输入公司名称进行搜索，查看专利年费到期情况'}
              {step === 'password' && '请输入密码以查看数据'}
              {step === 'results' && `${selectedCompany} 的专利年费数据`}
            </p>
          </div>

          {/* Step 1: 搜索公司 */}
          {step === 'search' && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">🏢 公司搜索</h2>
              <div>
                <label htmlFor="company-search" className="block text-sm font-medium text-gray-700 mb-2">
                  输入公司名称进行搜索（支持模糊搜索）
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="company-search"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="例如：保定开拓精密仪器制造有限责任公司"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    disabled={isSearching}
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm mt-4">
                  <div className="bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    📋 匹配到的公司（共 {searchResults.length} 个）
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {searchResults.slice(0, 10).map((company, index) => (
                      <button
                        key={index}
                        onClick={() => selectCompany(company)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-center justify-between focus:outline-none focus:bg-blue-50"
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-500">🏢</span>
                          <span className="text-gray-800 font-medium">{company}</span>
                        </div>
                        <span className="text-blue-600 text-sm whitespace-nowrap">选择 →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchTerm && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  未找到匹配的公司，请尝试其他关键词。
                </div>
              )}
            </div>
          )}

          {/* Step 2: 密码验证 */}
          {step === 'password' && (
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">身份验证</h2>
                <p className="text-gray-500 text-sm">请输入 <span className="font-medium text-blue-600">{selectedCompany}</span> 的访问密码</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">公司名称</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
                    {selectedCompany}
                  </div>
                </div>
                <div>
                  <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setStep('search'); setError(''); }}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    ← 返回
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium"
                  >
                    {loading ? '验证中...' : '查看数据'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 数据展示 */}
          {step === 'results' && (
            <>
              <div id="search-results" className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      📋 {selectedCompany} - 专利年费详情
                    </h2>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <span className="flex items-center">
                        📊 数据总量: <span className="font-bold ml-1">{feeData.length} 条</span>
                      </span>
                      {totalPages > 1 && (
                        <span className="flex items-center">
                          📄 当前: <span className="font-bold ml-1">第{currentPage}/{totalPages}页</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ↻ 重新搜索
                  </button>
                </div>

                {feeData.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {fieldNames.map((name) => (
                              <th key={name} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                {name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentFees.map((record, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              {fieldNames.map((name) => (
                                <td key={name} className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate">
                                  {name === '通知状态' ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(getFieldValue(record, name))}`}>
                                      {getFieldValue(record, name)}
                                    </span>
                                  ) : (
                                    getFieldValue(record, name)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          显示第 {startIndex + 1} 到 {Math.min(endIndex, feeData.length)} 条，共 {feeData.length} 条
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            上一页
                          </button>
                          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let page: number;
                            if (totalPages <= 7) {
                              page = i + 1;
                            } else if (currentPage <= 4) {
                              page = i + 1;
                            } else if (currentPage >= totalPages - 3) {
                              page = totalPages - 6 + i;
                            } else {
                              page = currentPage - 3 + i;
                            }
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                              >
                                {page}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            下一页
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📭</div>
                    <p>暂无专利年费数据</p>
                  </div>
                )}
              </div>

              {/* 说明 */}
              <div className="max-w-6xl mx-auto mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">📝 说明</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 数据来源于飞书多维表格，实时同步</li>
                  <li>• 如有疑问请联系河北玛仕知识产权服务有限公司</li>
                </ul>
              </div>
            </>
          )}

          {/* 使用指南（仅搜索页显示） */}
          {step === 'search' && (
            <div className="max-w-6xl mx-auto mt-16">
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">📖 使用指南</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-blue-600 text-2xl mb-4">🔍</div>
                  <h3 className="font-bold text-lg text-gray-800 mb-3">搜索公司</h3>
                  <p className="text-gray-600">在搜索框中输入公司名称，系统会自动匹配并显示相关结果。</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-blue-600 text-2xl mb-4">🔐</div>
                  <h3 className="font-bold text-lg text-gray-800 mb-3">密码验证</h3>
                  <p className="text-gray-600">选择公司后输入密码进行身份验证，确保数据安全。</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-blue-600 text-2xl mb-4">📋</div>
                  <h3 className="font-bold text-lg text-gray-800 mb-3">查看详情</h3>
                  <p className="text-gray-600">验证通过后即可查看专利年费详情，数据实时更新。</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ClientCenter;
