/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: 'postgresql://ai-short-video_owner:4QreXOSm1JjG@ep-falling-bush-a5fb2b2q.us-east-2.aws.neon.tech/ai-mock-interview?sslmode=require',
    }
  };