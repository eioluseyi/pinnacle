import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconPath = path.join(__dirname, 'dist/next/assets/icons/icon');

export const packagerConfig = {
  asar: true,
  executableName: 'Pinnacle',
  icon: iconPath,
  extraResource: ['dist'],

  // Uncomment if you have Apple Developer Account credentials
  // Code Signing for macOS (Required for Gatekeeper on modern macOS)
  // osxSign: {
  //   identity: process.env.APPLE_SIGNING_IDENTITY || undefined, // e.g. "Developer ID Application: Your Name (TEAM_ID)"
  //   'hardened-runtime': true,
  //   entitlements: 'entitlements.plist',
  //   'entitlements-inherit': 'entitlements.plist',
  //   'signature-flags': 'library',
  // },
};
export const rebuildConfig = {};
export const makers = [
  {
    name: '@electron-forge/maker-squirrel',
    config: {
      shortcutName: 'Pinnacle', // Exact name for Start Menu / Desktop shortcut
      setupIcon: `${iconPath}.ico`,
    },
  },
  // macOS: DMG (Preferred for direct distribution)
  // {
  //   name: '@electron-forge/maker-dmg',
  //   config: {
  //     name: 'Pinnacle',
  //     icon: path.join(__dirname, 'dist/next/assets/icons/icon.icns'),
  //     format: 'ULFO',
  //   },
  // },
  // macOS: ZIP (Required for auto-updates)
  {
    name: '@electron-forge/maker-zip',
    platforms: ['darwin'],
  },
  {
    name: '@electron-forge/maker-deb',
    platforms: ['linux'],
    config: {
      options: {
        icon: `${iconPath}.png`,
      },
    },
  },
  {
    name: '@electron-forge/maker-rpm',
    platforms: ['linux'],
    config: { icon: `${iconPath}.icns` },
  },
];
export const plugins = [
  {
    name: '@electron-forge/plugin-auto-unpack-natives',
    config: {},
  },
  // Fuses are used to enable/disable various Electron functionality
  // at package time, before code signing the application
  new FusesPlugin({
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  }),
];
export const publishers = [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'eioluseyi',
        name: 'pinnacle',
      },
      prerelease: false,
      draft: false,
    },
  },
];
