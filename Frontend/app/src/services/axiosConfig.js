// axiosConfig.js
import axios from 'axios';
import { message } from 'antd';
// 创建一个 axios 实例
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080', // 你的 API 基础 URL
});

// 添加请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 从 localStorage 中获取 token
    const token = localStorage.getItem('token');
    if (token) {
      // 将 token 添加到请求头
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
    response => {
      return response;
    },
    error => {
      // 统一处理错误信息
      const errorMessage = error.response && error.response.data && error.response.data.detail
        ? error.response.data.detail
        : 'An unexpected error occurred';
  
      message.error(errorMessage);
      return Promise.reject(error);
    }
  );

export default axiosInstance;
