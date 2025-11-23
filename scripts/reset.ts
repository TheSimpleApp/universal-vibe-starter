#!/usr/bin/env tsx
/**
 * Reset script - Cleans up files created by setup wizard
 * Run this to start fresh: npm run reset
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';

const ROOT = process.cwd();

const FILES_TO_REMOVE = [
  '.env.local',
  '.env',
  'dev.db',
  'dev.db-shm',
  'dev.db-wal',
];

const DIRS_TO_REMOVE = [
  '.expo',
  'node_modules/.cache',
];

const FILES_TO_RESTORE = [
  'App.tsx',
  'app.json',
  'babel.config.js',
  'tailwind.config.js',
  'global.css',
  'app/index.tsx',
  'app/lib/motion.tsx',
];

const DIRS_TO_CLEAR = [
  'app/(tabs)',
];

async function resetSetup() {
  console.clear();
  console.log(chalk.red.bold('🔄 Reset Setup Wizard'));
  console.log(chalk.gray('This will remove files created during setup.\n'));

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Are you sure you want to reset? This will delete setup artifacts.',
    initial: false,
  });

  if (!confirm) {
    console.log(chalk.yellow('\nReset cancelled.\n'));
    process.exit(0);
  }

  console.log(chalk.blue('\n🧹 Cleaning up setup artifacts...\n'));

  let removedCount = 0;
  let restoredCount = 0;

  // Remove files
  for (const file of FILES_TO_REMOVE) {
    const filePath = path.join(ROOT, file);
    if (await fs.pathExists(filePath)) {
      try {
        await fs.remove(filePath);
        console.log(chalk.green(`  ✅ Removed: ${file}`));
        removedCount++;
      } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Could not remove: ${file}`));
      }
    }
  }

  // Remove directories
  for (const dir of DIRS_TO_REMOVE) {
    const dirPath = path.join(ROOT, dir);
    if (await fs.pathExists(dirPath)) {
      try {
        await fs.remove(dirPath);
        console.log(chalk.green(`  ✅ Removed: ${dir}/`));
        removedCount++;
      } catch (error) {
        console.log(chalk.yellow(`  ⚠️  Could not remove: ${dir}/`));
      }
    }
  }

  // Clear directories (but keep structure)
  for (const dir of DIRS_TO_CLEAR) {
    const dirPath = path.join(ROOT, dir);
    if (await fs.pathExists(dirPath)) {
      try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          await fs.remove(path.join(dirPath, file));
        }
        console.log(chalk.green(`  ✅ Cleared: ${dir}/`));
      } catch (error) {
        // Directory might be empty, that's ok
      }
    }
  }

  // Restore files to default state (if they exist)
  const { restore } = await prompts({
    type: 'confirm',
    name: 'restore',
    message: 'Restore default template files? (Next.js app structure, Expo files, etc.)',
    initial: true,
  });

  if (restore) {
    console.log(chalk.blue('\n📝 Restoring default files...\n'));

    // Try to restore from template repo if available
    const templateRepo = path.join(path.dirname(ROOT), 'universal-vibe-starter');
    const hasTemplateRepo = await fs.pathExists(templateRepo);

    // Restore Next.js structure (src/app and src/middleware.ts)
    if (hasTemplateRepo) {
      const srcAppPath = path.join(templateRepo, 'src/app');
      const srcMiddlewarePath = path.join(templateRepo, 'src/middleware.ts');
      const destAppPath = path.join(ROOT, 'src/app');
      const destMiddlewarePath = path.join(ROOT, 'src/middleware.ts');

      if (await fs.pathExists(srcAppPath) && !await fs.pathExists(destAppPath)) {
        await fs.copy(srcAppPath, destAppPath);
        console.log(chalk.green('  ✅ Restored: src/app/'));
        restoredCount++;
      }

      if (await fs.pathExists(srcMiddlewarePath) && !await fs.pathExists(destMiddlewarePath)) {
        await fs.copy(srcMiddlewarePath, destMiddlewarePath);
        console.log(chalk.green('  ✅ Restored: src/middleware.ts'));
        restoredCount++;
      }
    } else {
      // Create basic Next.js structure if template repo not found
      const srcAppPath = path.join(ROOT, 'src/app');
      if (!await fs.pathExists(srcAppPath)) {
        await fs.ensureDir(srcAppPath);
        const layoutContent = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
        await fs.writeFile(path.join(srcAppPath, 'layout.tsx'), layoutContent);
        console.log(chalk.green('  ✅ Created: src/app/layout.tsx'));
        restoredCount++;
      }

      const middlewarePath = path.join(ROOT, 'src/middleware.ts');
      if (!await fs.pathExists(middlewarePath)) {
        const middlewareContent = `import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
`;
        await fs.writeFile(middlewarePath, middlewareContent);
        console.log(chalk.green('  ✅ Created: src/middleware.ts'));
        restoredCount++;
      }
    }

    // Restore app.json
    const appJsonPath = path.join(ROOT, 'app.json');
    if (await fs.pathExists(appJsonPath)) {
      const defaultAppJson = {
        expo: {
          name: 'universal-vibe-starter',
          slug: 'universal-vibe-starter',
          version: '1.0.0',
          orientation: 'portrait',
          icon: './assets/icon.png',
          userInterfaceStyle: 'automatic',
          splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
          },
          assetBundlePatterns: ['**/*'],
          ios: {
            supportsTablet: true,
          },
          android: {
            adaptiveIcon: {
              foregroundImage: './assets/adaptive-icon.png',
              backgroundColor: '#ffffff',
            },
          },
          web: {
            favicon: './assets/favicon.png',
          },
          plugins: ['expo-router'],
          newArchEnabled: true,
          scheme: 'universal-vibe',
        },
      };
      await fs.writeJSON(appJsonPath, defaultAppJson, { spaces: 2 });
      console.log(chalk.green('  ✅ Restored: app.json'));
      restoredCount++;
    }

    // Restore app/index.tsx
    const indexPath = path.join(ROOT, 'app/index.tsx');
    if (await fs.pathExists(path.dirname(indexPath))) {
      const defaultIndex = `import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Universal Vibe Starter
      </Text>
      <Text style={{ color: '#666', marginBottom: 40 }}>
        React Native / Expo
      </Text>
      <Link href="/auth/login" style={{ color: '#007AFF' }}>
        Go to Login
      </Link>
    </View>
  );
}
`;
      await fs.writeFile(indexPath, defaultIndex);
      console.log(chalk.green('  ✅ Restored: app/index.tsx'));
      restoredCount++;
    }

    // Restore App.tsx (Expo Router entry point)
    const appEntryPath = path.join(ROOT, 'App.tsx');
    if (!await fs.pathExists(appEntryPath)) {
      const appEntryContent = `import 'expo-router/entry';
`;
      await fs.writeFile(appEntryPath, appEntryContent);
      console.log(chalk.green('  ✅ Restored: App.tsx'));
      restoredCount++;
    }
  }

  console.log(chalk.green(`\n✅ Reset complete!`));
  console.log(chalk.gray(`   Removed ${removedCount} files/directories`));
  if (restore) {
    console.log(chalk.gray(`   Restored ${restoredCount} files`));
  }
  console.log(chalk.cyan('\n💡 You can now run: npm run setup\n'));
}

resetSetup().catch((error) => {
  console.error(chalk.red('\n❌ Reset failed:'), error);
  process.exit(1);
});

