module.exports = {
  apps: [
    {
      name: "wa-api",
      cwd: "/home/silent/whatsapp-saas/WHATSAPP/apps/api",
      script: "dist/apps/api/src/index.js",
      env: { NODE_ENV: "production" }
    },
    {
      name: "wa-webhook",
      cwd: "/home/silent/whatsapp-saas/WHATSAPP/apps/webhook",
      script: "dist/apps/webhook/src/index.js",
      env: { NODE_ENV: "production" }
    },
    {
      name: "wa-web",
      cwd: "/home/silent/whatsapp-saas/WHATSAPP/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: { NODE_ENV: "production", PORT: 3000 }
    }
  ]
}
