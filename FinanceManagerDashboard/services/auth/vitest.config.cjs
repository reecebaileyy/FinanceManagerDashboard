module.exports = {
  test: {
    environment: "node",
    globals: true,
    include: ["services/auth/test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
    },
  },
};
