export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/main.css"],
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/rank-s",
    jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  },
  app: {
    head: {
      title: "Rank S - Fitness Gym Management System",
      link: [{ rel: "icon", type: "image/png", href: "/logo.png" }],
    },
  },
});
