export default ({ env }) => ({
  upload: {
    config: {
      provider: "@strapi/provider-upload-cloudinary",
      providerOptions: {
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
        params: {
          folder: "strapi-uploads",
          resource_type: "auto",
        },
      },
    },
    actionOptions: {
      upload: {
        folder: "strapi-uploads",
        formats: ["thumbnail"],
      },
    },
  },
  "users-permissions": {
    config: {
      jwtSecret: env("JWT_SECRET"),
    },
  },
});
