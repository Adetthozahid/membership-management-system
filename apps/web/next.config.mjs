/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mms/shared"],
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
