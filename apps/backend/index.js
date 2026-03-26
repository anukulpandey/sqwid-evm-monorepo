require("./src/server").start().catch((error) => {
  console.error("Backend failed to start", error);
  process.exit(1);
});
