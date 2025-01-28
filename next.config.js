/** @type {import('next').NextConfig} */
 
const nextConfig = {
  experimental: {
    // ppr: 'incremental'
  }
};
 
module.exports = nextConfig;
module.exports = {
  optimizeResources: {
    preload: false // This will disable automatic preloading
  }
}