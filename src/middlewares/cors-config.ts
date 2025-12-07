/**
 * CORS configuration middleware
 */

export default (config, { strapi }) => {
  return async (ctx, next) => {
    // Set CORS headers
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    ctx.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    ctx.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (ctx.method === "OPTIONS") {
      ctx.status = 200;
      return;
    }

    await next();
  };
};
