/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Skip static generation for all pages — fully dynamic app
  output: 'standalone',
  generateBuildId: async () => 'materix-build',
}

module.exports = nextConfig
