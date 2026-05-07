import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * 允许开发环境中的跨域请求来源
   * 使用通配符允许所有本地和外网访问
   */
  allowedDevOrigins: ['*'],
  outputFileTracingRoot: path.join(process.cwd())
};

export default nextConfig;
