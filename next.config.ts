import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Increase Server Actions body size limit to allow image uploads via form actions
  serverActions: {
    // Accept up to 10 MB bodies for server actions (adjust if you need larger uploads)
    bodySizeLimit: '10mb',
  },
  // Note: allowedDevOrigins was tried here but caused runtime/typing issues with this Next version.
  // Keep next.config minimal — cross-origin dev warnings can be safely ignored or handled by
  // configuring the proxy to forward the appropriate headers.
  images: {
    // Temporary explicit domains list to ensure Next image optimizer allows picsum during Docker builds
    // This duplicates remotePatterns but provides an additional, explicit allowlist for domains.
    domains: ['picsum.photos'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yt3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
