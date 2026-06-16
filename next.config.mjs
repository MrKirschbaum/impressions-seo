/** @type {import('next').NextConfig} */
const nextConfig = {
  // Run instrumentation.ts on server boot (starts the recurring-scan scheduler).
  experimental: { instrumentationHook: true },
};
export default nextConfig;
