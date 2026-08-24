import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load .env from parent directory
config({ path: path.join(__dirname, "..", ".env") });

const nextConfig: NextConfig = {
  // The data/ folder lives one level above app/ (see src/lib/csv.ts). On
  // Vercel, serverless functions only bundle files their static tracer can
  // see — a dynamic fs.readFileSync(path.join(process.cwd(), "..", "data", ...))
  // isn't traced automatically, so without this the API routes would 404 on
  // read even though the CSVs are committed to the repo. Turbopack requires
  // outputFileTracingIncludes globs to stay inside the traced root, so the
  // root is raised to the repo root and the glob is relative to that.
  outputFileTracingRoot: path.join(__dirname, ".."),
  outputFileTracingIncludes: {
    "/api/**/*": ["data/**"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
    ],
  },
};

export default nextConfig;
