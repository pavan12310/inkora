/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  // Keep Prisma out of the server bundle so its native query engine stays
  // resolvable at runtime. Without this, serverless deploys throw
  // "could not locate the Query Engine".
  serverExternalPackages: ["@prisma/client", "prisma"],
  async redirects() {
    return [
      // Keep one canonical host. Set SITE_URL to the version you want indexed.
      { source: "/index.html", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
