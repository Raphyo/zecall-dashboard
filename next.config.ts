/** @type {import('next').NextConfig} */
 
const nextConfig = {
  experimental: {
    // ppr: 'incremental',
    turbo: {
      rules: {
        // Use glob patterns instead of extensions
        // Example: "*.mdx": ["mdx-loader"]
      }
    }
  },
};
 
module.exports = nextConfig;