module.exports = {
  apps: [
    {
      name: "qualoan-partner",
      script: "npm",
      args: "run start",
      instances: 1,
      autorestart: true,
    },
  ],
};
