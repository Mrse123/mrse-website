// API 基础地址配置
// 开发环境走 vite proxy（相对路径），生产环境走指定后端
// Netlify 部署时走香港服务器 API
export const API_BASE = import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'http://124.156.163.133');
