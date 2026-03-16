const nextConfig = {
  experimental:{
    serverActions: {
      bodySizeLimit: "100mb",
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "djwphnnjxenmwkvc.public.blob.vercel-storage.com"
      }
    ],
  },
};

export default nextConfig;
