/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Use Webpack instead of Turbopack for build
    experimental: {
        turbo: false,
    },
};

export default nextConfig;
