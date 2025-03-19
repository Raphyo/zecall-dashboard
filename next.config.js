/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zecall-dashboard.vercel.app',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true
  }
};

module.exports = nextConfig;
