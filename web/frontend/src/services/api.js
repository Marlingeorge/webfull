import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const API_BASE_HOST = API_BASE_URL.replace(/\/api\/?$/, '');

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

export default instance;
