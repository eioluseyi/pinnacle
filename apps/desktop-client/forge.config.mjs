import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(workspaceEnvPath)) {
  process.loadEnvFile(workspaceEnvPath);
}

const entitlementsPath = path.resolve(__dirname, 'entitlements.plist');
const requestedSigningIdentity = process.env.APPLE_SIGNING_IDENTITY?.trim();
let signingIdentity;

if (requestedSigningIdentity && process.platform === 'darwin') {
  const availableSigningIdentities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (availableSigningIdentities.includes(requestedSigningIdentity)) {
    signingIdentity = requestedSigningIdentity;
  } else {
    console.warn('APPLE_SIGNING_IDENTITY is not installed as a valid macOS signing identity; building unsigned.');
  }
}

const iconPath = path.join(__dirname, 'dist/next/assets/icons/icon');

export const packagerConfig = {
  asar: true,
  prune: false,
  name: 'Pinnacle client',
  productName: 'Pinnacle client',
  executableName: 'Pinnacle client',
  icon: iconPath,
  extraResource: ['dist'],

  ...(signingIdentity
    ? {
        osxSign: {
          identity: signingIdentity,
          hardenedRuntime: true,
          entitlements: entitlementsPath,
          signatureFlags: 'library',
          continueOnError: false,
        },
      }
    : {}),
};

export const hooks = {
  packageAfterCopy: async (_config, buildPath) => {
    const sourceFramework = path.join(__dirname, 'node_modules/node-syphon/dist/Frameworks/Syphon.framework');

    if (!fs.existsSync(sourceFramework)) {
      throw new Error(`node-syphon framework not found: ${sourceFramework}`);
    }

    const appFrameworksPath = path.resolve(buildPath, '../../Frameworks');
    fs.mkdirSync(appFrameworksPath, { recursive: true });
    execFileSync('ditto', [sourceFramework, path.join(appFrameworksPath, 'Syphon.framework')]);
  },
};

export const rebuildConfig = {};
export const makers = [
  // {
  //   name: '@electron-forge/maker-squirrel',
  //   config: {
  //     name: 'Pinnacle client',
  //     shortcutName: 'Pinnacle client', // Exact name for Start Menu / Desktop shortcut
  //     setupIcon: `${iconPath}.ico`,
  //   },
  // },
  // macOS: DMG (Preferred for direct distribution)
  {
    name: '@electron-forge/maker-dmg',
    config: {
      name: 'Pinnacle client',
      icon: path.join(__dirname, 'dist/next/assets/icons/icon.icns'),
      format: 'ULFO',
    },
  },
  // macOS: ZIP (Required for auto-updates)
  // {
  //   name: '@electron-forge/maker-zip',
  //   platforms: ['darwin'],
  // },
  // {
  //   name: '@electron-forge/maker-deb',
  //   platforms: ['linux'],
  //   config: {
  //     options: {
  //       name: 'pinnacle-client',
  //       bin: 'Pinnacle client',
  //       productName: 'Pinnacle client',
  //       icon: `${iconPath}.png`,
  //     },
  //   },
  // },
  // {
  //   name: '@electron-forge/maker-rpm',
  //   platforms: ['linux'],
  //   config: {
  //     options: {
  //       name: 'pinnacle-client',
  //       bin: 'Pinnacle client',
  //       productName: 'Pinnacle client',
  //       icon: `${iconPath}.png`,
  //     },
  //   },
  // },
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
      tagPrefix: 'desktop-client-v',
      repository: {
        owner: 'eioluseyi',
        name: 'pinnacle',
      },
      prerelease: false,
      draft: false,
    },
  },
];
