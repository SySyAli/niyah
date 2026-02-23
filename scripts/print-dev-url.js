const os = require("os");
const iface = Object.values(os.networkInterfaces())
  .flat()
  .find((n) => n.family === "IPv4" && !n.internal);
const ip = iface ? iface.address : "localhost";
setTimeout(() => {
  console.log(`\n › Manual URL: http://${ip}:8081\n`);
}, 2000);
