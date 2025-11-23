import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execSync, spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);
const ROOT = process.cwd();

// --- UTILITY FUNCTIONS ---

function checkCommand(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

async function runCommand(command: string, options: { cwd?: string; silent?: boolean } = {}): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const { stdout, stderr } = await exec(command, { 
      cwd: options.cwd || ROOT,
      encoding: 'utf8'
    });
    if (stderr && !options.silent) {
      console.log(chalk.gray(stderr));
    }
    return { success: true, output: stdout };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function printHeader(text: string) {
  console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
  console.log(chalk.cyan.bold(`  ${text}`));
  console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
}

function printStep(step: number, total: number, text: string) {
  console.log(chalk.blue.bold(`\n[${step}/${total}] ${text}`));
  console.log(chalk.gray('─'.repeat(50)));
}

// --- MAIN SETUP FLOW ---

async function main() {
  // Check if we're in the right directory
  if (!await fs.pathExists(path.join(ROOT, 'package.json'))) {
    console.log(chalk.red('❌ Error: package.json not found.'));
    console.log(chalk.yellow('Please run this script from the project root directory.\n'));
    process.exit(1);
  }

  console.clear();
  printHeader('🌊 Universal Vibe Starter - Onboarding Wizard');
  
  console.log(chalk.gray('This wizard will guide you through setting up your project.\n'));
  console.log(chalk.gray('You can press Ctrl+C at any time to exit.\n'));

  const steps = [];
  
  // Step 1: Check Prerequisites
  printStep(1, 7, 'Checking Prerequisites');
  const checks = await checkPrerequisites();
  steps.push({ name: 'Prerequisites', done: checks.allGood });
  
  if (!checks.allGood) {
    const { continue: shouldContinue } = await prompts({
      type: 'confirm',
      name: 'continue',
      message: 'Some prerequisites are missing. Continue anyway?',
      initial: false,
    });
    
    if (!shouldContinue) {
      console.log(chalk.yellow('\nSetup cancelled. Please install missing tools and try again.'));
      process.exit(0);
    }
  }

  // Step 2: Platform Selection
  printStep(2, 7, 'Selecting Platform');
  const platform = await selectPlatform();
  steps.push({ name: 'Platform', done: true });

  // Step 3: Module Selection
  printStep(3, 7, 'Selecting Modules');
  const modules = await selectModules(platform);
  steps.push({ name: 'Modules', done: true });

  // Step 4: Setup Platform Structure
  printStep(4, 8, 'Setting Up Platform Structure');
  await setupPlatformStructure(platform);
  steps.push({ name: 'Platform Structure', done: true });

  // Step 5: Auth Provider Selection
  printStep(5, 8, 'Selecting Auth Provider');
  const authConfig = await selectAuthProvider();
  steps.push({ name: 'Auth Provider', done: true });

  // Step 6: Supabase Setup (only if Supabase auth selected)
  let supabaseConfig: any = null;
  if (authConfig.provider === 'supabase') {
    printStep(6, 8, 'Configuring Supabase');
    supabaseConfig = await configureSupabase();
    steps.push({ name: 'Supabase', done: true });
  } else {
    console.log(chalk.gray('\nSkipping Supabase setup (using ' + authConfig.provider + ' for auth)\n'));
    steps.push({ name: 'Supabase', done: false });
  }

  // Step 7: Clean Up Unused Modules
  printStep(7, 8, 'Cleaning Up Modules');
  await pruneModules(modules.selected, platform, authConfig);
  steps.push({ name: 'Cleanup', done: true });

  // Step 8: Generate Environment File
  printStep(8, 8, 'Generating Environment Configuration');
  await generateEnvFile(modules.selected, supabaseConfig, platform, authConfig);
  steps.push({ name: 'Environment', done: true });

  // Step 9: Database Setup (only for Next.js with Supabase)
  let dbSeeded = false;
  if (platform.includes('nextjs') && authConfig.provider === 'supabase' && supabaseConfig) {
    const dbSetup = await setupDatabase(supabaseConfig);
    dbSeeded = dbSetup.seeded;
    steps.push({ name: 'Database', done: dbSetup.success });
  } else if (platform.includes('nextjs') && authConfig.provider !== 'supabase') {
    console.log(chalk.yellow('\n⚠️  Database setup skipped (not using Supabase auth)\n'));
  }

  // Final Summary
  printHeader('✅ Setup Complete!');
  
  console.log(chalk.green.bold('\n🎉 Your project is ready to launch!\n'));
  
  console.log(chalk.cyan('Next Steps:\n'));
  
  if (platform.includes('nextjs')) {
    console.log(chalk.white('  1. Start Next.js dev server:'));
    console.log(chalk.gray('     npm run dev\n'));
  }
  
  if (platform.includes('react-native')) {
    console.log(chalk.white('  2. Start Expo dev server:'));
    console.log(chalk.gray('     npm run expo:start\n'));
    console.log(chalk.gray('     Or: npm run expo:ios / npm run expo:android\n'));
  }
  
  if (supabaseConfig.setupType === 'local') {
    const stepNum = platform.includes('nextjs') ? '2' : '1';
    console.log(chalk.white(`  ${stepNum}. Supabase is running locally`));
    console.log(chalk.gray(`     Dashboard: ${supabaseConfig.dashboardUrl || 'http://localhost:54323'}\n`));
  }
  
  if (dbSeeded) {
    const stepNum = platform.includes('nextjs') && supabaseConfig.setupType === 'local' ? '3' : 
                    platform.includes('nextjs') ? '2' : '1';
    console.log(chalk.white(`  ${stepNum}. Test credentials:`));
    console.log(chalk.gray('     Email: test@example.com'));
    console.log(chalk.gray('     Password: Testing123\n'));
  }
  
  console.log(chalk.yellow('📝 Note: Make sure to add your API keys to .env.local for production services.\n'));
  
  if (platform.includes('nextjs') || platform.includes('react-native')) {
    const { launch } = await prompts({
      type: 'confirm',
      name: 'launch',
      message: platform.includes('nextjs') 
        ? 'Would you like to start the Next.js dev server now?'
        : 'Would you like to start the Expo dev server now?',
      initial: true,
    });

    if (launch) {
      console.log(chalk.green('\n🚀 Starting dev server...\n'));
      if (platform.includes('nextjs')) {
        spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
      } else {
        spawn('npm', ['run', 'expo:start'], { stdio: 'inherit', shell: true });
      }
    }
  }
}

// --- STEP FUNCTIONS ---

async function checkPrerequisites() {
  const results = {
    node: checkCommand('node'),
    npm: checkCommand('npm'),
    supabase: checkCommand('supabase'),
    allGood: true,
  };

  console.log(chalk.gray('Checking required tools...\n'));

  // Check Node.js
  if (results.node) {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(chalk.green(`  ✅ Node.js: ${version}`));
  } else {
    console.log(chalk.red('  ❌ Node.js: Not found'));
    console.log(chalk.yellow('     Install from: https://nodejs.org/'));
    results.allGood = false;
  }

  // Check npm/pnpm
  if (results.npm) {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(chalk.green(`  ✅ npm: ${version}`));
  } else {
    console.log(chalk.red('  ❌ npm: Not found'));
    results.allGood = false;
  }

  // Check Supabase CLI
  if (results.supabase) {
    const version = execSync('supabase --version', { encoding: 'utf8' }).trim();
    console.log(chalk.green(`  ✅ Supabase CLI: ${version}`));
  } else {
    console.log(chalk.yellow('  ⚠️  Supabase CLI: Not found'));
    console.log(chalk.gray('     Install with: npm install -g supabase'));
    console.log(chalk.gray('     Or: brew install supabase/tap/supabase'));
    console.log(chalk.gray('     We can install it for you if needed.\n'));
  }

  return results;
}

async function selectPlatform() {
  console.log(chalk.gray('Choose which platform(s) you want to build for.\n'));

  const { platforms } = await prompts({
    type: 'multiselect',
    name: 'platforms',
    message: 'Which platforms do you want to include?',
    choices: [
      { title: 'Next.js (Web)', value: 'nextjs', selected: true },
      { title: 'React Native / Expo (Mobile)', value: 'react-native', selected: false },
    ],
    min: 1,
  });

  return platforms || ['nextjs'];
}

async function selectModules(platform: string[]) {
  console.log(chalk.gray('Select which modules you want to KEEP in your project.\n'));
  console.log(chalk.gray('Unselected modules will be removed.\n'));

  const choices = [
    { title: 'Stripe (Payments)', value: 'stripe', selected: true },
    { title: 'Mux (Video)', value: 'mux', selected: false },
    { title: 'Twilio (SMS/Voice)', value: 'twilio', selected: false },
    { title: 'ElevenLabs (AI Voice)', value: 'elevenlabs', selected: false },
  ];

  // Inngest only makes sense for Next.js (server-side)
  if (platform.includes('nextjs')) {
    choices.push({ title: 'Inngest (Background Jobs)', value: 'inngest', selected: true });
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'modules',
    message: 'Which modules do you need?',
    choices,
  });

  return { selected: new Set(response.modules || []) };
}

async function selectAuthProvider() {
  console.log(chalk.gray('Choose how you want to handle authentication.\n'));

  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Which auth provider do you want to use?',
    choices: [
      { title: 'Supabase Auth (Recommended - Built-in)', value: 'supabase', selected: true },
      { title: 'Firebase Auth', value: 'firebase', selected: false },
      { title: 'Custom/Other (Clerk, Auth0, etc.)', value: 'custom', selected: false },
    ],
    initial: 0,
  });

  let customProviderName = '';
  if (provider === 'custom') {
    const { name } = await prompts({
      type: 'text',
      name: 'name',
      message: 'What auth provider are you using? (e.g., Clerk, Auth0, NextAuth)',
      validate: (value) => value.length > 0 || 'Provider name is required',
    });
    customProviderName = name;
  }

  return {
    provider: provider || 'supabase',
    customProviderName: customProviderName || '',
  };
}

async function configureSupabase() {
  const { setupType } = await prompts({
    type: 'select',
    name: 'setupType',
    message: 'How do you want to set up Supabase?',
    choices: [
      { title: 'Local Development (Recommended for testing)', value: 'local' },
      { title: 'Cloud Project (Production)', value: 'cloud' },
      { title: 'Skip for now (Configure later)', value: 'skip' },
    ],
    initial: 0,
  });

  if (setupType === 'skip') {
    return {
      setupType: 'skip',
      url: '',
      anonKey: '',
      serviceKey: '',
      databaseUrl: '',
    };
  }

  if (setupType === 'local') {
    return await setupLocalSupabase();
  } else {
    return await setupCloudSupabase();
  }
}

async function setupLocalSupabase() {
  console.log(chalk.gray('\nSetting up local Supabase...\n'));

  // Check if Supabase CLI is installed
  if (!checkCommand('supabase')) {
    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Supabase CLI not found. Install it now? (requires npm)',
      initial: true,
    });

    if (install) {
      console.log(chalk.blue('Installing Supabase CLI...'));
      const result = await runCommand('npm install -g supabase', { silent: true });
      if (!result.success) {
        console.log(chalk.red('Failed to install Supabase CLI. Please install manually.'));
        return await setupLocalSupabase();
      }
      console.log(chalk.green('✅ Supabase CLI installed\n'));
    } else {
      console.log(chalk.yellow('Please install Supabase CLI and run setup again.'));
      process.exit(0);
    }
  }

  // Check if Supabase is already running
  const statusResult = await runCommand('supabase status', { silent: true });
  const output = statusResult.output || '';
  const isRunning = statusResult.success && (output.includes('API URL') || output.includes('Started'));

  if (isRunning) {
    console.log(chalk.green('✅ Supabase is already running locally\n'));
    
    // Extract values from status with robust parsing
    const urlMatch = output.match(/API URL[:\s]+(https?:\/\/[^\s\n]+)/i) || 
                     output.match(/API URL:\s*(https?:\/\/[^\s]+)/);
    const anonKeyMatch = output.match(/anon key[:\s]+([^\s\n]+)/i) || 
                        output.match(/anon key:\s*([^\s]+)/);
    const serviceKeyMatch = output.match(/service_role key[:\s]+([^\s\n]+)/i) || 
                           output.match(/service_role key:\s*([^\s]+)/);
    const dbUrlMatch = output.match(/DB URL[:\s]+(postgresql:\/\/[^\s\n]+)/i) || 
                      output.match(/DB URL:\s*(postgresql:\/\/[^\s]+)/);

    const config = {
      setupType: 'local' as const,
      url: urlMatch?.[1] || 'http://127.0.0.1:54321',
      anonKey: anonKeyMatch?.[1] || '',
      serviceKey: serviceKeyMatch?.[1] || '',
      databaseUrl: dbUrlMatch?.[1] || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      dashboardUrl: 'http://localhost:54323',
    };

    if (!config.anonKey || !config.serviceKey) {
      console.log(chalk.yellow('⚠️  Could not extract keys. You may need to update .env.local manually.\n'));
    }

    return config;
  }

  // Start Supabase
  console.log(chalk.blue('Starting Supabase locally (this may take a minute)...\n'));
  const startResult = await runCommand('supabase start');

  if (!startResult.success) {
    console.log(chalk.red('\n❌ Failed to start Supabase locally.'));
    console.log(chalk.yellow('You may need to initialize Supabase first.'));
    
    const { init } = await prompts({
      type: 'confirm',
      name: 'init',
      message: 'Initialize Supabase in this project?',
      initial: true,
    });

    if (init) {
      await runCommand('supabase init');
      await runCommand('supabase start');
    } else {
      return {
        setupType: 'local',
        url: 'http://127.0.0.1:54321',
        anonKey: '',
        serviceKey: '',
        databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      };
    }
  }

  // Get status again to extract values
  const statusResult2 = await runCommand('supabase status');
  const output = statusResult2.output || '';
  
  // Try multiple patterns to extract values (Supabase CLI output can vary)
  const urlMatch = output.match(/API URL[:\s]+(https?:\/\/[^\s\n]+)/i) || 
                   output.match(/API URL:\s*(https?:\/\/[^\s]+)/);
  const anonKeyMatch = output.match(/anon key[:\s]+([^\s\n]+)/i) || 
                      output.match(/anon key:\s*([^\s]+)/);
  const serviceKeyMatch = output.match(/service_role key[:\s]+([^\s\n]+)/i) || 
                         output.match(/service_role key:\s*([^\s]+)/);
  const dbUrlMatch = output.match(/DB URL[:\s]+(postgresql:\/\/[^\s\n]+)/i) || 
                    output.match(/DB URL:\s*(postgresql:\/\/[^\s]+)/);

  console.log(chalk.green('\n✅ Supabase is running locally\n'));

  // Fallback to default local values if parsing fails
  const config = {
    setupType: 'local' as const,
    url: urlMatch?.[1] || 'http://127.0.0.1:54321',
    anonKey: anonKeyMatch?.[1] || '',
    serviceKey: serviceKeyMatch?.[1] || '',
    databaseUrl: dbUrlMatch?.[1] || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    dashboardUrl: 'http://localhost:54323',
  };

  // Warn if we couldn't extract keys
  if (!config.anonKey || !config.serviceKey) {
    console.log(chalk.yellow('⚠️  Could not extract Supabase keys from status output.'));
    console.log(chalk.gray('   Run "supabase status" manually and update .env.local if needed.\n'));
  }

  return config;
}

async function setupCloudSupabase() {
  console.log(chalk.gray('\nYou\'ll need to provide your Supabase project credentials.\n'));
  console.log(chalk.gray('Get these from: https://app.supabase.com/project/_/settings/api\n'));

  const { url } = await prompts({
    type: 'text',
    name: 'url',
    message: 'Supabase Project URL:',
    validate: (value) => value.length > 0 || 'URL is required',
  });

  const { anonKey } = await prompts({
    type: 'password',
    name: 'anonKey',
    message: 'Supabase Anon Key:',
    validate: (value) => value.length > 0 || 'Anon key is required',
  });

  const { serviceKey } = await prompts({
    type: 'password',
    name: 'serviceKey',
    message: 'Supabase Service Role Key:',
    validate: (value) => value.length > 0 || 'Service key is required',
  });

  // Extract database URL from project URL
  const projectRef = url.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
  const databaseUrl = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

  console.log(chalk.yellow('\n⚠️  Note: You\'ll need to set DATABASE_URL manually in .env.local'));
  console.log(chalk.gray(`   Format: ${databaseUrl}\n`));

  return {
    setupType: 'cloud',
    url,
    anonKey,
    serviceKey,
    databaseUrl: '', // User needs to set this manually
  };
}

async function setupPlatformStructure(platform: string[]) {
  console.log(chalk.gray('Setting up platform structure...\n'));

  if (platform.includes('react-native')) {
    await setupReactNative();
  }

  if (!platform.includes('nextjs')) {
    // Remove Next.js specific files if not selected
    console.log(chalk.yellow('  - Removing Next.js structure (not selected)'));
    await removeNextJsStructure();
  }

  console.log(chalk.green('\n✅ Platform structure ready\n'));
}

async function setupReactNative() {
  console.log(chalk.blue('  Setting up React Native / Expo...\n'));

  // Check for Expo CLI
  const hasExpo = checkCommand('expo') || checkCommand('npx');
  
  if (!hasExpo) {
    console.log(chalk.yellow('  ⚠️  Expo CLI not found. You may need to install it later.'));
  }

  // Create Expo app structure
  const expoDirs = [
    'app', // Expo Router
    'app/(tabs)',
    'components',
    'hooks',
    'utils',
  ];

  for (const dir of expoDirs) {
    await fs.ensureDir(path.join(ROOT, dir));
  }

  // Create app.json if it doesn't exist
  const appJsonPath = path.join(ROOT, 'app.json');
  if (!await fs.pathExists(appJsonPath)) {
    const appJson = {
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
        scheme: 'universal-vibe',
      },
    };
    await fs.writeJSON(appJsonPath, appJson, { spaces: 2 });
    console.log(chalk.green('  ✅ Created app.json'));
  }

  // Create basic Expo Router structure
  const indexPath = path.join(ROOT, 'app/index.tsx');
  if (!await fs.pathExists(indexPath)) {
    const indexContent = `import { View, Text } from 'react-native';
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
    await fs.writeFile(indexPath, indexContent);
    console.log(chalk.green('  ✅ Created app/index.tsx'));
  }

  // Create nativewind config if not exists
  const tailwindConfigPath = path.join(ROOT, 'tailwind.config.js');
  if (!await fs.pathExists(tailwindConfigPath)) {
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
`;
    await fs.writeFile(tailwindConfigPath, tailwindConfig);
    console.log(chalk.green('  ✅ Created tailwind.config.js for NativeWind'));
  }

  // Create global.css with oklch design tokens (matching web)
  const globalCssPath = path.join(ROOT, 'global.css');
  if (!await fs.pathExists(globalCssPath)) {
    const globalCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --radius: 0.65rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.606 0.25 292.717);
  --primary-foreground: oklch(0.969 0.016 293.756);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.606 0.25 292.717);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.541 0.281 293.009);
  --primary-foreground: oklch(0.969 0.016 293.756);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.541 0.281 293.009);
}
`;
    await fs.writeFile(globalCssPath, globalCss);
    console.log(chalk.green('  ✅ Created global.css with Linear theme tokens'));
  }

  // Create React Native motion library
  const motionLibPath = path.join(ROOT, 'app/lib/motion.tsx');
  const motionLibDir = path.dirname(motionLibPath);
  await fs.ensureDir(motionLibDir);
  
  if (!await fs.pathExists(motionLibPath)) {
    const motionLibContent = `import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  SlideInDown,
  SlideOutUp,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pressable, PressableProps } from 'react-native';

// Fade In Component
export function FadeInView({
  children,
  delay = 0,
  duration = 300,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
} & Animated.AnimatedProps<any>) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(duration)}
      exiting={FadeOut.duration(duration)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

// Slide Up Component
export function SlideUpView({
  children,
  delay = 0,
  duration = 300,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
} & Animated.AnimatedProps<any>) {
  return (
    <Animated.View
      entering={SlideInUp.delay(delay).duration(duration).springify()}
      exiting={SlideOutDown.duration(duration)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

// Slide Down Component
export function SlideDownView({
  children,
  delay = 0,
  duration = 300,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
} & Animated.AnimatedProps<any>) {
  return (
    <Animated.View
      entering={SlideInDown.delay(delay).duration(duration).springify()}
      exiting={SlideOutUp.duration(duration)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

// Pressable with Scale Animation
export function PressableScale({
  children,
  onPress,
  scale = 0.95,
  ...props
}: {
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
} & PressableProps) {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    scaleValue.value = withSpring(scale, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

// Stagger Container for lists
export function StaggerContainer({
  children,
  delay = 50,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ gap: delay }}
    >
      {React.Children.map(children, (child, index) => (
        <Animated.View
          key={index}
          entering={FadeIn.delay(index * delay).duration(300)}
        >
          {child}
        </Animated.View>
      ))}
    </Animated.View>
  );
}
`;
    await fs.writeFile(motionLibPath, motionLibContent);
    console.log(chalk.green('  ✅ Created app/lib/motion.tsx with Reanimated primitives'));
  }

  // Create babel.config.js with Reanimated plugin
  const babelConfigPath = path.join(ROOT, 'babel.config.js');
  if (!await fs.pathExists(babelConfigPath)) {
    const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
`;
    await fs.writeFile(babelConfigPath, babelConfig);
    console.log(chalk.green('  ✅ Created babel.config.js with Reanimated plugin'));
  }

  // Update package.json scripts for Expo
  const packageJsonPath = path.join(ROOT, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const pkg = await fs.readJSON(packageJsonPath);
    if (!pkg.scripts['expo:start']) {
      pkg.scripts = {
        ...pkg.scripts,
        'expo:start': 'expo start',
        'expo:android': 'expo start --android',
        'expo:ios': 'expo start --ios',
        'expo:web': 'expo start --web',
      };
      await fs.writeJSON(packageJsonPath, pkg, { spaces: 2 });
    }
  }
}

async function removeNextJsStructure() {
  const nextJsPaths = [
    'src/app',
    'src/middleware.ts',
    'next.config.ts',
  ];

  for (const p of nextJsPaths) {
    const fullPath = path.join(ROOT, p);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }
}

async function pruneModules(keep: Set<string>, platform: string[], authConfig: any) {
  console.log(chalk.gray('Removing unused modules...\n'));

  const modules = ['mux', 'twilio', 'elevenlabs', 'stripe'];
  
  for (const module of modules) {
    if (!keep.has(module)) {
      const modulePath = path.join(ROOT, `src/services/${module}`);
      if (await fs.pathExists(modulePath)) {
        await fs.remove(modulePath);
        console.log(chalk.yellow(`  - Removed ${module} service`));
      }
    }
  }

  // Inngest only for Next.js
  if (platform.includes('nextjs') && !keep.has('inngest')) {
    await fs.remove(path.join(ROOT, 'src/inngest'));
    await fs.remove(path.join(ROOT, 'src/app/api/inngest'));
    console.log(chalk.yellow('  - Removed Inngest module'));
  } else if (!platform.includes('nextjs')) {
    // Remove Inngest if not using Next.js
    await fs.remove(path.join(ROOT, 'src/inngest'));
    await fs.remove(path.join(ROOT, 'src/app/api/inngest'));
  }

  // Remove Supabase auth files if not using Supabase auth
  if (authConfig.provider !== 'supabase' && platform.includes('nextjs')) {
    const middlewarePath = path.join(ROOT, 'src/middleware.ts');
    const supabaseUtilsPath = path.join(ROOT, 'src/utils/supabase');
    
    if (await fs.pathExists(middlewarePath)) {
      await fs.remove(middlewarePath);
      console.log(chalk.yellow('  - Removed src/middleware.ts (Supabase auth not selected)'));
    }
    
    if (await fs.pathExists(supabaseUtilsPath)) {
      await fs.remove(supabaseUtilsPath);
      console.log(chalk.yellow('  - Removed src/utils/supabase (Supabase auth not selected)'));
    }
  }

  console.log(chalk.green('\n✅ Module cleanup complete\n'));
}

async function generateEnvFile(keep: Set<string>, supabaseConfig: any, platform: string[], authConfig: any) {
  console.log(chalk.gray('Generating .env.local file...\n'));

  const envPath = path.join(ROOT, '.env.example');
  if (!await fs.pathExists(envPath)) {
    console.log(chalk.yellow('⚠️  .env.example not found, creating basic .env.local'));
    await createBasicEnvFile(keep, supabaseConfig, authConfig);
    await updateCursorRules(authConfig);
    return;
  }

  let content = await fs.readFile(envPath, 'utf8');

  // Remove unused module sections
  if (!keep.has('mux')) {
    content = content.replace(/# --- MUX START ---[\s\S]*?# --- MUX END ---/g, '');
  }
  if (!keep.has('stripe')) {
    content = content.replace(/# --- STRIPE START ---[\s\S]*?# --- STRIPE END ---/g, '');
  }
  if (!keep.has('twilio')) {
    content = content.replace(/# --- TWILIO START ---[\s\S]*?# --- TWILIO END ---/g, '');
  }
  if (!keep.has('elevenlabs')) {
    content = content.replace(/# --- ELEVENLABS START ---[\s\S]*?# --- ELEVENLABS END ---/g, '');
  }

  // Replace Supabase values only if using Supabase auth
  if (authConfig.provider === 'supabase' && supabaseConfig) {
    if (supabaseConfig.setupType === 'local') {
      content = content.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${supabaseConfig.url}`);
      content = content.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseConfig.anonKey}`);
      content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, `SUPABASE_SERVICE_ROLE_KEY=${supabaseConfig.serviceKey}`);
      content = content.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${supabaseConfig.databaseUrl}`);
    } else if (supabaseConfig.setupType === 'cloud') {
      content = content.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${supabaseConfig.url}`);
      content = content.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseConfig.anonKey}`);
      content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, `SUPABASE_SERVICE_ROLE_KEY=${supabaseConfig.serviceKey}`);
      // Database URL needs to be set manually for cloud
    }
  } else {
    // Remove Supabase env vars if not using Supabase auth
    content = content.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, '');
    content = content.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, '');
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, '');
    content = content.replace(/DATABASE_URL=.*/g, '');
  }

  // Add site URL if not present
  if (!content.includes('NEXT_PUBLIC_SITE_URL')) {
    content += '\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n';
  }

  await fs.writeFile(path.join(ROOT, '.env.local'), content.trim());
  console.log(chalk.green('✅ Created .env.local\n'));
  
  // Update cursor rules with auth config
  await updateCursorRules(authConfig);
  
  // For React Native, also create .env file (Expo uses .env)
  if (platform.includes('react-native')) {
    await fs.copy(path.join(ROOT, '.env.local'), path.join(ROOT, '.env'));
    console.log(chalk.green('✅ Created .env for Expo\n'));
  }
}

async function createBasicEnvFile(keep: Set<string>, supabaseConfig: any, authConfig: any) {
  let content = `# --- CORE CONFIG ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000

`;

  // Only add Supabase env vars if using Supabase auth
  if (authConfig.provider === 'supabase' && supabaseConfig) {
    content += `DATABASE_URL=${supabaseConfig.databaseUrl || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'}
NEXT_PUBLIC_SUPABASE_URL=${supabaseConfig.url || 'http://127.0.0.1:54321'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseConfig.anonKey || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${supabaseConfig.serviceKey || 'your-service-key'}

`;
  } else if (authConfig.provider === 'firebase') {
    content += `# --- FIREBASE START ---
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# --- FIREBASE END ---

`;
  } else if (authConfig.provider === 'custom') {
    content += `# --- ${authConfig.customProviderName.toUpperCase()} AUTH START ---
# Add your ${authConfig.customProviderName} credentials here
# --- ${authConfig.customProviderName.toUpperCase()} AUTH END ---

`;
  }

  if (keep.has('stripe')) {
    content += `# --- STRIPE START ---
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# --- STRIPE END ---

`;
  }

  if (keep.has('mux')) {
    content += `# --- MUX START ---
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
# --- MUX END ---

`;
  }

  if (keep.has('twilio')) {
    content += `# --- TWILIO START ---
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
# --- TWILIO END ---

`;
  }

  if (keep.has('elevenlabs')) {
    content += `# --- ELEVENLABS START ---
ELEVENLABS_API_KEY=...
# --- ELEVENLABS END ---

`;
  }

  content += `# --- INNGEST START ---
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local
# --- INNGEST END ---
`;

  await fs.writeFile(path.join(ROOT, '.env.local'), content.trim());
}

async function setupDatabase(supabaseConfig: any) {
  if (supabaseConfig.setupType === 'skip') {
    console.log(chalk.yellow('⚠️  Skipping database setup. Run "npm run db:push" manually.\n'));
    return { success: false, seeded: false };
  }

  console.log(chalk.gray('Pushing database schema...\n'));

  // Push schema
  const pushResult = await runCommand('npm run db:push');
  
  if (!pushResult.success) {
    console.log(chalk.red('❌ Failed to push database schema.'));
    console.log(chalk.yellow('You can try running "npm run db:push" manually.\n'));
    return { success: false, seeded: false };
  }

  console.log(chalk.green('✅ Database schema pushed\n'));

  // Ask about seeding
  const { seed } = await prompts({
    type: 'confirm',
    name: 'seed',
    message: 'Seed database with test user? (test@example.com / Testing123)',
    initial: true,
  });

  if (seed) {
    console.log(chalk.gray('\nSeeding database...\n'));
    const seedResult = await runCommand('npm run db:reset', { silent: true });
    
    if (seedResult.success) {
      console.log(chalk.green('✅ Database seeded\n'));
      return { success: true, seeded: true };
    } else {
      console.log(chalk.yellow('⚠️  Seeding had issues, but schema is ready.\n'));
      return { success: true, seeded: false };
    }
  }

  return { success: true, seeded: false };
}

async function updateCursorRules(authConfig: any) {
  const cursorRulesPath = path.join(ROOT, '.cursorrules');
  
  if (!await fs.pathExists(cursorRulesPath)) {
    // Create basic cursor rules if it doesn't exist
    let rulesContent = `# 🧠 Vibe Coding Architecture

## Auth Strategy
**Provider:** ${authConfig.provider === 'custom' ? authConfig.customProviderName : authConfig.provider}
${authConfig.provider === 'custom' ? `**Custom Provider:** ${authConfig.customProviderName}` : ''}

## 1. Modular Strategy (CRITICAL)
`;
    await fs.writeFile(cursorRulesPath, rulesContent);
  } else {
    // Update existing cursor rules
    let rulesContent = await fs.readFile(cursorRulesPath, 'utf8');
    
    // Remove old auth section if exists
    rulesContent = rulesContent.replace(/## Auth Strategy[\s\S]*?(?=##|\n##|$)/, '');
    
    // Add new auth section at the top
    const authSection = `## Auth Strategy
**Provider:** ${authConfig.provider === 'custom' ? authConfig.customProviderName : authConfig.provider}
${authConfig.provider === 'custom' ? `**Custom Provider:** ${authConfig.customProviderName}` : ''}

`;
    
    rulesContent = authSection + rulesContent;
    await fs.writeFile(cursorRulesPath, rulesContent);
  }
  
  console.log(chalk.green(`✅ Updated .cursorrules with auth provider: ${authConfig.provider === 'custom' ? authConfig.customProviderName : authConfig.provider}\n`));
}

// Run the wizard
main().catch((error) => {
  console.error(chalk.red('\n❌ Setup failed:'), error);
  process.exit(1);
});
