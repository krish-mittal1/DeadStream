/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || "http://3.107.10.252:8000";

const nextConfig = {
  output: "standalone",
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
