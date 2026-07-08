/** @type {import('next').NextConfig} */
const BACKEND = "http://3.107.10.252:8000";

const nextConfig = {
  output: "standalone",
  // Socket.IO long-polling uses `/socket.io/?...` which Vercel/Next may 308-redirect
  // to `/socket.io?...`. Redirects break Engine.IO POST/handshake. Disable it.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${BACKEND}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
