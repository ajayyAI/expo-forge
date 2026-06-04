const { getDefaultConfig } = require("expo/metro-config");
const { dirname } = require("node:path");
const { withUniwindConfig } = require("uniwind/metro");

const projectRoot = dirname(require.resolve("./package.json"));
const config = getDefaultConfig(projectRoot);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
});
