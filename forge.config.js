import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';

export const packagerConfig = {
  asar: true,
  icon: 'public/assets/icons/icon',
  extraResource: [path.resolve('server')],

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
      iconUrl: 'public/assets/icons/icon.ico',
      setupIcon: 'public/assets/icons/icon.ico',
    },
  },
  // macOS: DMG (Preferred for direct distribution)
  {
    name: '@electron-forge/maker-dmg',
    config: {
      name: 'Pinnacle',
      icon: 'public/assets/icons/icon.icns',
      format: 'ULFO',
    },
  },
  // macOS: ZIP (Required for auto-updates)
  {
    name: '@electron-forge/maker-zip',
    platforms: ['darwin'],
  },
  {
    name: '@electron-forge/maker-deb',
    config: {
      options: {
        icon: 'public/assets/icons/icon.png',
      },
    },
  },
  {
    name: '@electron-forge/maker-rpm',
    config: { icon: 'public/assets/icons/icon.icns' },
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
    },
  },
];
