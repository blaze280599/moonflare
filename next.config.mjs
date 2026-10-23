/** @type {import('next').NextConfig} */
const nextConfig = {
  // HoloCard releases its WebGL context on unmount. Strict mode's dev-only
  // mount → unmount → mount would release the canvas's context and leave it blank.
  reactStrictMode: false
};

export default nextConfig;
