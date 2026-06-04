// Config plugin: force a uniform iOS deployment target across all CocoaPods
// targets. expo-build-properties sets the app target's deployment target, but
// some pods can drift; this normalizes every pod target during `pod install`
// so SDK 56 builds stay consistent.
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const MARKER = "# with-pod-deployment-target";

const POST_INSTALL_RE = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;

const buildInjection = (target) => `
    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${target}'
      end
    end
`;

const withPodDeploymentTarget = (config, { target = "16.4" } = {}) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      const podfile = fs.readFileSync(podfilePath, "utf8");
      if (podfile.includes(MARKER)) return cfg;

      const injection = buildInjection(target);
      if (!POST_INSTALL_RE.test(podfile)) {
        throw new Error(
          "with-pod-deployment-target: react_native_post_install call not found"
        );
      }
      const next = podfile.replace(POST_INSTALL_RE, `$1${injection}`);
      fs.writeFileSync(podfilePath, next);
      return cfg;
    },
  ]);

module.exports = withPodDeploymentTarget;
