import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execSync, spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';

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

async function runCommandWithOutput(command: string, options: { cwd?: string; timeout?: number; quiet?: boolean } = {}): Promise<{ success: boolean; output?: string; error?: string }> {
  return new Promise((resolve) => {
    // Use shell: true to handle complex commands properly
    const child = spawn(command, {
      cwd: options.cwd || ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;
    let lastOutputTime = Date.now();
    let startTime = Date.now();
    let currentStatus = '';
    let statusUpdateInterval: NodeJS.Timeout | null = null;

    // Set up timeout (default 5 minutes for long-running commands like supabase start)
    const timeout = options.timeout || 5 * 60 * 1000;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGTERM');
        resolve({ 
          success: false, 
          error: `Command timed out after ${timeout / 1000} seconds. The process may still be running in the background.` 
        });
      }
    }, timeout);

    // Smart status display for Supabase
    const updateStatus = (status: string, showTime = true) => {
      if (options.quiet) return;
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const elapsedStr = elapsed > 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
      const timeStr = showTime ? chalk.gray(` (${elapsedStr})`) : '';
      
      // Clear previous line and write new status
      process.stdout.write(`\r${chalk.blue('   ⏳')} ${status}${timeStr}${' '.repeat(20)}`);
      currentStatus = status;
    };

    // Track progress stages for ETA estimation
    let stage = 'initializing';
    const stageTimes: { [key: string]: number } = {};
    
    // Parse Supabase output for meaningful status updates
    const parseSupabaseOutput = (text: string): string | null => {
      const lower = text.toLowerCase();
      const now = Date.now();
      
      // Key status indicators with stage tracking
      if (lower.includes('pulling') || lower.includes('downloading')) {
        const match = text.match(/(pulling|downloading)\s+([^\s]+)/i);
        if (stage !== 'downloading') {
          stage = 'downloading';
          stageTimes.downloading = now;
        }
        const elapsed = Math.floor((now - startTime) / 1000);
        // Estimate: downloading typically takes 60-120 seconds
        const estimated = elapsed < 60 ? '~2-3 min remaining' : elapsed < 120 ? '~1 min remaining' : 'almost done';
        return match ? `Downloading ${match[2]}... (${estimated})` : `Downloading images... (${estimated})`;
      }
      if (lower.includes('extracting') || lower.includes('extract')) {
        if (stage !== 'extracting') {
          stage = 'extracting';
          stageTimes.extracting = now;
        }
        return 'Extracting files...';
      }
      if (lower.includes('creating') || lower.includes('starting')) {
        const match = text.match(/(creating|starting)\s+([^\s]+)/i);
        if (stage !== 'starting') {
          stage = 'starting';
          stageTimes.starting = now;
        }
        // Show container name if available
        const containerMatch = text.match(/supabase[_-]?([^\s]+)/i);
        if (containerMatch) {
          return `Starting container: ${containerMatch[0]}...`;
        }
        return match ? `Starting ${match[2]}...` : 'Starting containers...';
      }
      // Docker-specific status
      if (lower.includes('container') && (lower.includes('create') || lower.includes('start'))) {
        const containerMatch = text.match(/container[:\s]+([^\s,]+)/i);
        if (containerMatch) {
          return `Creating container: ${containerMatch[1]}...`;
        }
      }
      if (lower.includes('waiting for') || lower.includes('waiting')) {
        if (stage !== 'waiting') {
          stage = 'waiting';
          stageTimes.waiting = now;
        }
        return 'Waiting for services to start...';
      }
      if (lower.includes('healthy') || lower.includes('ready')) {
        if (stage !== 'healthy') {
          stage = 'healthy';
          stageTimes.healthy = now;
        }
        return 'Services are healthy...';
      }
      if (lower.includes('api url') || lower.includes('started')) {
        stage = 'complete';
        return 'Database is ready!';
      }
      if (lower.includes('error') || lower.includes('failed')) {
        return null; // Let errors show normally
      }
      
      return null; // Don't show generic output
    };

    // Status update interval (updates every 2 seconds with elapsed time)
    if (!options.quiet) {
      statusUpdateInterval = setInterval(() => {
        if (!resolved && currentStatus) {
          updateStatus(currentStatus);
        }
      }, 2000);
    }

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      lastOutputTime = Date.now();
      
      if (!options.quiet) {
        const status = parseSupabaseOutput(text);
        if (status) {
          updateStatus(status);
        }
      } else {
        process.stdout.write(text);
      }
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      lastOutputTime = Date.now();
      
      if (!options.quiet) {
        const status = parseSupabaseOutput(text);
        if (status) {
          updateStatus(status);
        } else if (text.includes('error') || text.includes('Error') || text.includes('ERROR')) {
          // Show errors
          process.stdout.write(`\n${chalk.red('   ❌')} ${text.trim()}\n`);
        }
      } else {
        process.stderr.write(text);
      }
    });

    child.on('close', (code) => {
      if (statusUpdateInterval) clearInterval(statusUpdateInterval);
      clearTimeout(timeoutId);
      
      // Clear status line
      if (!options.quiet && currentStatus) {
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
      }
      
      if (!resolved) {
        resolved = true;
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: stderr || `Command exited with code ${code}`, output: stdout });
        }
      }
    });

    child.on('error', (error) => {
      if (statusUpdateInterval) clearInterval(statusUpdateInterval);
      clearTimeout(timeoutId);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: error.message });
      }
    });
  });
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

async function verifyInstalledVersions() {
  try {
    // Check Next.js version
    const nextVersion = execSync('npm list next --depth=0 2>/dev/null', { 
      encoding: 'utf8',
      cwd: ROOT 
    }).match(/next@([^\s]+)/)?.[1] || 'unknown';
    
    // Check React version
    const reactVersion = execSync('npm list react --depth=0 2>/dev/null', { 
      encoding: 'utf8',
      cwd: ROOT 
    }).match(/react@([^\s]+)/)?.[1] || 'unknown';

    const nextMajor = parseInt(nextVersion.split('.')[0]);
    const reactMajor = parseInt(reactVersion.split('.')[0]);

    if (nextMajor === 16) {
      console.log(chalk.green(`  ✅ Next.js: v${nextVersion} (latest stable)`));
    } else if (nextMajor === 15) {
      console.log(chalk.yellow(`  ⚠️  Next.js: v${nextVersion} (outdated, v16 available)`));
    } else {
      console.log(chalk.yellow(`  ⚠️  Next.js: v${nextVersion}`));
    }

    if (reactMajor === 19) {
      console.log(chalk.green(`  ✅ React: v${reactVersion} (latest stable)`));
    } else {
      console.log(chalk.yellow(`  ⚠️  React: v${reactVersion} (v19 recommended)`));
    }

  } catch (error) {
    console.log(chalk.gray('  ℹ️  Package verification skipped (packages not yet installed)'));
  }
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
  printStep(1, 10, 'Checking Prerequisites');
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

  // Step 2: Verify/Install Dependencies
  printStep(2, 10, 'Installing Project Dependencies');
  console.log(chalk.gray('   Downloading and installing all the code libraries this project needs...\n'));
  
  if (!await fs.pathExists(path.join(ROOT, 'node_modules'))) {
    console.log(chalk.yellow('⚠️  Project packages not installed yet'));
    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Install all required packages now? (This may take 1-2 minutes)',
      initial: true,
    });
    
    if (install) {
      console.log(chalk.blue('\n📦 Installing packages...'));
      console.log(chalk.gray('   This downloads React, Next.js, and other libraries from the internet.\n'));
      const installResult = await runCommandWithOutput('npm install', { timeout: 5 * 60 * 1000 });
      if (!installResult.success) {
        console.log(chalk.red('\n❌ Failed to install packages.'));
        console.log(chalk.yellow('   Please check your internet connection and try: npm install\n'));
        process.exit(1);
      }
      console.log(chalk.green('\n✅ All packages installed successfully!\n'));
    } else {
      console.log(chalk.yellow('⚠️  Skipping package installation. Setup may fail later.\n'));
    }
  } else {
    console.log(chalk.green('✅ Packages already installed\n'));
  }
  steps.push({ name: 'Dependencies', done: true });

  // Step 3: Platform Selection
  printStep(3, 10, 'Choosing Your Platform');
  console.log(chalk.gray('   Select whether you want to build a web app, mobile app, or both\n'));
  const platform = await selectPlatform();
  steps.push({ name: 'Platform', done: true });

  // Step 4: Module Selection
  printStep(4, 10, 'Selecting Features');
  console.log(chalk.gray('   Choose which services you want to use (payments, video, AI, etc.)\n'));
  const modules = await selectModules(platform);
  steps.push({ name: 'Modules', done: true });

  // Step 5: Auth Provider Selection
  printStep(5, 10, 'Setting Up Authentication');
  console.log(chalk.gray('   Choose how users will log in to your app\n'));
  const authConfig = await selectAuthProvider();
  steps.push({ name: 'Auth Provider', done: true });

  // Step 6: Setup Platform Structure
  printStep(6, 10, 'Creating Project Files');
  console.log(chalk.gray('   Setting up the folder structure and configuration files\n'));
  await setupPlatformStructure(platform);
  steps.push({ name: 'Platform Structure', done: true });

  // Step 7: Database Setup
  let supabaseConfig: any = null;
  if (authConfig.provider === 'mock') {
    printStep(7, 10, 'Setting Up Database');
    console.log(chalk.green('   ⚡ Using SQLite - instant setup, no Docker!\n'));
    supabaseConfig = await configureSQLite();
    steps.push({ name: 'Database', done: true });
  } else if (authConfig.provider === 'supabase-cloud') {
    printStep(7, 10, 'Setting Up Database');
    console.log(chalk.gray('   Connecting to Supabase Cloud (no Docker needed)\n'));
    supabaseConfig = await setupCloudSupabase();
    // Normalize provider name
    authConfig.provider = 'supabase';
    steps.push({ name: 'Database', done: true });
  } else if (authConfig.provider === 'supabase') {
    printStep(7, 10, 'Setting Up Database');
    console.log(chalk.yellow('   ⚠️  Using Supabase Local (requires Docker - may be slow)\n'));
    console.log(chalk.gray('   💡 Tip: Supabase Cloud is faster and doesn\'t need Docker\n'));
    supabaseConfig = await setupLocalSupabase();
    steps.push({ name: 'Database', done: true });
  } else {
    console.log(chalk.gray('\nSkipping database setup (using ' + authConfig.provider + ' for auth)\n'));
    steps.push({ name: 'Database', done: false });
  }

  // Step 8: Clean Up Unused Modules
  printStep(8, 10, 'Removing Unused Code');
  console.log(chalk.gray('   Cleaning up features you didn\'t select to keep your project lean\n'));
  await pruneModules(modules.selected, platform, authConfig);
  steps.push({ name: 'Cleanup', done: true });

  // Step 9: Generate Environment File
  printStep(9, 10, 'Creating Configuration File');
  console.log(chalk.gray('   Setting up your .env.local file with database and API settings\n'));
  await generateEnvFile(modules.selected, supabaseConfig, platform, authConfig);
  steps.push({ name: 'Environment', done: true });

  // Step 10: Database Setup
  let dbSeeded = false;
  if (platform.includes('nextjs') && authConfig.provider === 'mock' && supabaseConfig) {
    printStep(10, 10, 'Creating Database Tables');
    console.log(chalk.gray('   Setting up SQLite database (instant - no Docker!)\n'));
    const dbSetup = await setupSQLiteDatabase();
    dbSeeded = dbSetup.seeded;
    steps.push({ name: 'Database', done: dbSetup.success });
  } else if (platform.includes('nextjs') && authConfig.provider === 'supabase' && supabaseConfig) {
    printStep(10, 10, 'Creating Database Tables');
    console.log(chalk.gray('   Setting up your database schema and creating initial data\n'));
    const dbSetup = await setupDatabase(supabaseConfig);
    dbSeeded = dbSetup.seeded;
    steps.push({ name: 'Database', done: dbSetup.success });
  } else if (platform.includes('nextjs') && authConfig.provider !== 'supabase' && authConfig.provider !== 'mock') {
    console.log(chalk.yellow('\n⚠️  Database setup skipped (using ' + authConfig.provider + ' auth)\n'));
  }

  // Verify installations (if packages are installed)
  if (await fs.pathExists(path.join(ROOT, 'node_modules'))) {
    console.log(chalk.cyan('\n🔍 Double-checking everything is set up correctly...\n'));
    await verifyInstalledVersions();
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
    console.log(chalk.white(`  ${stepNum}. Database is running locally`));
    console.log(chalk.gray(`     Dashboard: ${supabaseConfig.dashboardUrl || 'http://localhost:54323'}`));
    console.log(chalk.gray(`     💡 Tip: Keep Docker running to use your local database\n`));
  } else if (supabaseConfig.setupType === 'cloud') {
    const stepNum = platform.includes('nextjs') ? '2' : '1';
    console.log(chalk.white(`  ${stepNum}. Database is connected to Supabase Cloud`));
    console.log(chalk.gray(`     Dashboard: https://supabase.com/dashboard/project/${supabaseConfig.url?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || ''}`));
    console.log(chalk.gray(`     ✅ No Docker needed - everything runs in the cloud!\n`));
  }
  
  if (dbSeeded) {
    const stepNum = platform.includes('nextjs') && supabaseConfig.setupType === 'local' ? '3' : 
                    platform.includes('nextjs') ? '2' : '1';
    console.log(chalk.white(`  ${stepNum}. Test credentials:`));
    if (authConfig.provider === 'mock') {
      console.log(chalk.gray('     Email: test@example.com'));
      console.log(chalk.gray('     Password: Test123\n'));
    } else {
      console.log(chalk.gray('     Email: test@example.com'));
      console.log(chalk.gray('     Password: Testing123\n'));
    }
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
        // Use npx expo directly to avoid script issues
        spawn('npx', ['expo', 'start'], { stdio: 'inherit', shell: true });
      }
    }
  }
}

// --- STEP FUNCTIONS ---

async function checkPortAvailable(port: number): Promise<boolean> {
  try {
    // Use net module for accurate port checking
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
      // Timeout after 1 second
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        resolve(true); // Assume available if we can't bind
      }, 1000);
    });
  } catch {
    // Fallback: try to check with system commands
    try {
      if (process.platform === 'win32') {
        execSync(`netstat -ano | findstr :${port}`, { stdio: 'ignore' });
        return false;
      } else {
        execSync(`lsof -ti:${port}`, { stdio: 'ignore' });
        return false;
      }
    } catch {
      return true; // Assume available if we can't check
    }
  }
}

async function checkDiskSpace(): Promise<{ available: boolean; message: string }> {
  try {
    // Try using df command (Unix/Mac) or wmic (Windows)
    if (process.platform === 'win32') {
      try {
        const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
        // Parse Windows output (simplified - would need more robust parsing)
        return { available: true, message: 'Disk space check skipped on Windows' };
      } catch {
        return { available: true, message: 'Unable to check' };
      }
    } else {
      try {
        const output = execSync(`df -h "${ROOT}" | tail -1 | awk '{print $4}'`, { encoding: 'utf8' });
        const freeSpace = output.trim();
        return { available: true, message: `${freeSpace} available` };
      } catch {
        return { available: true, message: 'Unable to check' };
      }
    }
  } catch {
    return { available: true, message: 'Unable to check' };
  }
}

function createSpinner(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let interval: NodeJS.Timeout | null = null;

  const start = () => {
    process.stdout.write(`\r${chalk.blue(frames[frameIndex])} ${message}`);
    interval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      process.stdout.write(`\r${chalk.blue(frames[frameIndex])} ${message}`);
    }, 100);
  };

  const stop = (success: boolean, finalMessage?: string) => {
    if (interval) clearInterval(interval);
    const icon = success ? chalk.green('✅') : chalk.red('❌');
    const msg = finalMessage || message;
    process.stdout.write(`\r${icon} ${msg}\n`);
  };

  return { start, stop };
}

async function checkNvmAvailable(): Promise<{ available: boolean; nvmPath?: string }> {
  // Check if nvm.sh exists (common nvm installation paths)
  const possiblePaths = [
    path.join(process.env.HOME || '', '.nvm', 'nvm.sh'),
    path.join(process.env.HOME || '', '.config', 'nvm', 'nvm.sh'),
    '/usr/local/opt/nvm/nvm.sh', // Homebrew on macOS
  ];

  for (const nvmPath of possiblePaths) {
    if (fs.existsSync(nvmPath)) {
      return { available: true, nvmPath };
    }
  }

  // Try to detect nvm via shell
  try {
    const result = await runCommand('bash -c "source ~/.nvm/nvm.sh 2>/dev/null && command -v nvm"', { silent: true });
    if (result.success) {
      return { available: true, nvmPath: path.join(process.env.HOME || '', '.nvm', 'nvm.sh') };
    }
  } catch {
    // Ignore
  }

  return { available: false };
}

async function fixNodeVersion(recommendedVersion: string): Promise<boolean> {
  const nvmCheck = await checkNvmAvailable();
  
  if (!nvmCheck.available) {
    console.log(chalk.yellow('\n   💡 nvm not found - cannot auto-switch Node version'));
    console.log(chalk.gray('      Option 1: Install nvm: https://github.com/nvm-sh/nvm'));
    console.log(chalk.gray(`      Option 2: Download Node.js ${recommendedVersion} from https://nodejs.org/`));
    console.log(chalk.gray('      Option 3: Continue anyway (may have compatibility issues)\n'));
    
    // Still give user options even without nvm
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { 
          title: '📥 Install nvm + Node.js automatically (recommended)', 
          description: 'Install nvm, then automatically install and switch to Node.js ' + recommendedVersion,
          value: 'install_nvm' 
        },
        { 
          title: '🌐 Open Node.js download page', 
          description: 'Open browser to download Node.js ' + recommendedVersion + ' manually',
          value: 'open_download' 
        },
        { 
          title: '⏭️  Continue anyway (not recommended)', 
          description: 'Proceed with current Node version - may have compatibility issues',
          value: 'continue' 
        },
        { 
          title: '❌ Cancel setup', 
          description: 'Exit and fix Node version manually',
          value: 'cancel' 
        },
      ],
      initial: 0,
    });

    if (action === 'cancel') {
      console.log(chalk.yellow('\nSetup cancelled. Please fix Node.js version and try again.'));
      console.log(chalk.gray(`   Install nvm: https://github.com/nvm-sh/nvm`));
      console.log(chalk.gray(`   Or download Node.js ${recommendedVersion}: https://nodejs.org/\n`));
      process.exit(0);
    } else if (action === 'open_download') {
      console.log(chalk.blue(`\n   🌐 Opening Node.js download page...`));
      const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      try {
        execSync(`${openCmd} https://nodejs.org/`, { stdio: 'ignore' });
        console.log(chalk.green('   ✅ Browser opened'));
        console.log(chalk.gray(`      Download Node.js ${recommendedVersion} LTS\n`));
        
        const { continueAfterDownload } = await prompts({
          type: 'confirm',
          name: 'continueAfterDownload',
          message: 'After installing Node.js, continue setup?',
          initial: true,
        });
        
        if (!continueAfterDownload) {
          console.log(chalk.yellow('\nSetup paused. After installing Node.js, run: npm run setup\n'));
          process.exit(0);
        }
      } catch {
        console.log(chalk.yellow('   ⚠️  Could not open browser automatically'));
        console.log(chalk.gray(`      Please visit: https://nodejs.org/\n`));
      }
    } else if (action === 'install_nvm') {
      console.log(chalk.blue('\n   📥 Installing nvm...'));
      console.log(chalk.gray('      This will download and install nvm, then switch Node versions\n'));
      
      // Try to install nvm
      const installNvmResult = await runCommandWithOutput(
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash',
        { timeout: 2 * 60 * 1000, quiet: false }
      );
      
      if (installNvmResult.success) {
        console.log(chalk.green('   ✅ nvm installed!'));
        
        // Try to source nvm and install Node.js in the same session
        const nvmPath = path.join(process.env.HOME || '', '.nvm', 'nvm.sh');
        console.log(chalk.blue(`\n   📥 Installing Node.js ${recommendedVersion}...`));
        
        const installNodeCmd = `bash -c 'source "${nvmPath}" && nvm install ${recommendedVersion}'`;
        const installNodeResult = await runCommandWithOutput(installNodeCmd, { 
          timeout: 5 * 60 * 1000, 
          quiet: false 
        });
        
        if (installNodeResult.success) {
          console.log(chalk.green(`   ✅ Node.js ${recommendedVersion} installed!`));
          
          // Try to use it
          const useNodeCmd = `bash -c 'source "${nvmPath}" && nvm use ${recommendedVersion} && node --version'`;
          const useNodeResult = await runCommand(useNodeCmd, { silent: true });
          
          if (useNodeResult.success && useNodeResult.output) {
            const newVersion = useNodeResult.output.trim();
            console.log(chalk.green(`   ✅ Switched to Node.js ${newVersion}\n`));
            console.log(chalk.yellow('   ⚠️  Note: You may need to restart your terminal for changes to persist'));
            console.log(chalk.gray(`      Or run: source ~/.nvm/nvm.sh && nvm use ${recommendedVersion}\n`));
            return true; // Successfully fixed!
          } else {
            console.log(chalk.yellow(`   ⚠️  Installed but couldn't switch in this session`));
            console.log(chalk.yellow('   ⚠️  Please restart your terminal, then run:'));
            console.log(chalk.gray(`      nvm use ${recommendedVersion}`));
            console.log(chalk.gray(`      npm run setup\n`));
          }
        } else {
          console.log(chalk.yellow('   ⚠️  nvm installed but could not install Node.js automatically'));
          console.log(chalk.yellow('   ⚠️  Please restart your terminal, then run:'));
          console.log(chalk.gray(`      nvm install ${recommendedVersion}`));
          console.log(chalk.gray(`      nvm use ${recommendedVersion}`));
          console.log(chalk.gray(`      npm run setup\n`));
        }
        
        const { continueNow } = await prompts({
          type: 'confirm',
          name: 'continueNow',
          message: 'Continue setup now? (recommended: restart terminal first)',
          initial: false,
        });
        
        if (!continueNow) {
          console.log(chalk.yellow('\nSetup paused. After restarting terminal and switching Node version, run: npm run setup\n'));
          process.exit(0);
        }
      } else {
        console.log(chalk.yellow('   ⚠️  Could not install nvm automatically.'));
        console.log(chalk.gray('      Please install manually: https://github.com/nvm-sh/nvm\n'));
      }
    }
    
    // If continuing, return false (not fixed) so caller can prompt
    return false;
  }

  const nvmPath = nvmCheck.nvmPath || path.join(process.env.HOME || '', '.nvm', 'nvm.sh');
  
  // Verify nvm path exists
  if (!fs.existsSync(nvmPath)) {
    console.log(chalk.red(`\n   ❌ nvm.sh not found at: ${nvmPath}`));
    console.log(chalk.yellow('   ⚠️  nvm may not be properly installed'));
    console.log(chalk.gray('      Please install nvm: https://github.com/nvm-sh/nvm\n'));
    return false;
  }

  // Test if nvm is accessible BEFORE asking user
  console.log(chalk.gray('      Testing nvm accessibility...'));
  const testNvmCmd = `bash -l -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && command -v nvm >/dev/null 2>&1 && echo "ok"'`;
  const testNvm = await runCommand(testNvmCmd, { silent: true });
  
  if (!testNvm.success || testNvm.output?.trim() !== 'ok') {
    // nvm exists but not accessible - give user options
    console.log(chalk.yellow('\n   ⚠️  nvm is installed but not accessible in this shell'));
    console.log(chalk.gray('      This is normal - nvm needs to be loaded in your shell session'));
    console.log(chalk.gray('      The setup script cannot access nvm from this process.\n'));
    
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { 
          title: '📋 Copy commands to fix manually (recommended)', 
          description: 'I\'ll show you the exact commands to run in your terminal',
          value: 'show_commands' 
        },
        { 
          title: '🌐 Open Node.js download page', 
          description: 'Download and install Node.js ' + recommendedVersion + ' manually',
          value: 'open_download' 
        },
        { 
          title: '⏭️  Continue anyway (not recommended)', 
          description: 'Proceed with current Node version - may have issues',
          value: 'continue' 
        },
        { 
          title: '❌ Cancel setup', 
          description: 'Exit and fix Node version manually',
          value: 'cancel' 
        },
      ],
      initial: 0,
    });

    if (action === 'cancel') {
      console.log(chalk.yellow('\nSetup cancelled. Please fix Node.js version and try again.\n'));
      process.exit(0);
    } else if (action === 'show_commands') {
      console.log(chalk.cyan('\n   📋 Run these commands in your terminal:\n'));
      console.log(chalk.white('      source ~/.nvm/nvm.sh'));
      console.log(chalk.white(`      nvm install ${recommendedVersion}`));
      console.log(chalk.white(`      nvm use ${recommendedVersion}`));
      console.log(chalk.white(`      cd ${ROOT}`));
      console.log(chalk.white(`      npm run setup\n`));
      
      const { continueAfterFix } = await prompts({
        type: 'confirm',
        name: 'continueAfterFix',
        message: 'After running those commands, continue setup?',
        initial: false,
      });
      
      if (!continueAfterFix) {
        console.log(chalk.yellow('\nSetup paused. After fixing Node version, run: npm run setup\n'));
        process.exit(0);
      }
      return false; // Not fixed yet
    } else if (action === 'open_download') {
      console.log(chalk.blue(`\n   🌐 Opening Node.js download page...`));
      const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      try {
        execSync(`${openCmd} https://nodejs.org/`, { stdio: 'ignore' });
        console.log(chalk.green('   ✅ Browser opened'));
        console.log(chalk.gray(`      Download Node.js ${recommendedVersion} LTS\n`));
        
        const { continueAfterDownload } = await prompts({
          type: 'confirm',
          name: 'continueAfterDownload',
          message: 'After installing Node.js, continue setup?',
          initial: false,
        });
        
        if (!continueAfterDownload) {
          console.log(chalk.yellow('\nSetup paused. After installing Node.js, run: npm run setup\n'));
          process.exit(0);
        }
      } catch {
        console.log(chalk.yellow('   ⚠️  Could not open browser automatically'));
        console.log(chalk.gray(`      Please visit: https://nodejs.org/\n`));
      }
      return false;
    }
    // If continuing, return false so caller can prompt
    return false;
  }

  // nvm is accessible - can auto-fix!
  console.log(chalk.blue('\n   🔧 nvm is accessible - can auto-fix Node version!'));
  const { fix } = await prompts({
    type: 'confirm',
    name: 'fix',
    message: `Switch to Node.js ${recommendedVersion} automatically?`,
    initial: true,
  });

  if (!fix) {
    return false;
  }

  console.log(chalk.blue(`\n   📥 Installing Node.js ${recommendedVersion}...`));

  // Use bash login shell to properly source nvm and run commands
  const installCmd = `bash -l -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm install ${recommendedVersion}'`;
  const useCmd = `bash -l -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use ${recommendedVersion}'`;

  try {
    // Install Node.js version
    console.log(chalk.gray('      Installing... (this may take 1-2 minutes)'));
    const installResult = await runCommandWithOutput(
      installCmd,
      { timeout: 5 * 60 * 1000, quiet: false }
    );
    
    if (!installResult.success) {
      const error = installResult.error || '';
      const output = installResult.output || '';
      const fullError = (error + ' ' + output).trim();
      
      console.log(chalk.yellow('\n   ⚠️  Could not install via nvm.'));
      
      // Show helpful error details
      if (fullError.includes('command not found') || fullError.includes('nvm: command not found') || fullError.includes('bash: nvm:')) {
        console.log(chalk.yellow('   💡 nvm command not found - shell environment issue'));
        console.log(chalk.gray('      This happens because nvm needs to be loaded in your shell'));
        console.log(chalk.gray('      Please run these commands in your terminal:'));
        console.log(chalk.cyan(`      source ~/.nvm/nvm.sh`));
        console.log(chalk.cyan(`      nvm install ${recommendedVersion}`));
        console.log(chalk.cyan(`      nvm use ${recommendedVersion}`));
        console.log(chalk.cyan(`      npm run setup\n`));
      } else if (fullError.includes('already installed') || fullError.includes('v' + recommendedVersion) || output.includes(recommendedVersion)) {
        console.log(chalk.green(`   ✅ Node.js ${recommendedVersion} appears to be installed!`));
        console.log(chalk.gray('      Attempting to switch to it...'));
        // Continue to try to use it below - don't return false
      } else {
        // Show actual error for debugging
        console.log(chalk.gray(`      Error output: ${fullError.substring(0, 400)}`));
        console.log(chalk.yellow('   💡 This might be a shell environment issue'));
        console.log(chalk.gray('      Try running manually in your terminal:'));
        console.log(chalk.cyan(`      source ~/.nvm/nvm.sh`));
        console.log(chalk.cyan(`      nvm install ${recommendedVersion}`));
        console.log(chalk.cyan(`      nvm use ${recommendedVersion}\n`));
        return false;
      }
    }

    // Switch to the version (or try if install failed but version exists)
    console.log(chalk.gray('      Switching version...'));
    const useResult = await runCommand(useCmd, { silent: false });
    
    if (!useResult.success) {
      console.log(chalk.yellow('\n   ⚠️  Installed but could not switch in this session'));
      console.log(chalk.yellow('   💡 This is normal - nvm needs to be sourced in your shell'));
      console.log(chalk.gray('      Run in your terminal:'));
      console.log(chalk.gray(`      source ~/.nvm/nvm.sh`));
      console.log(chalk.gray(`      nvm use ${recommendedVersion}`));
      console.log(chalk.gray(`      npm run setup\n`));
      
      const { continueNow } = await prompts({
        type: 'confirm',
        name: 'continueNow',
        message: 'Continue setup? (Node version will be fixed after terminal restart)',
        initial: false,
      });
      
      if (!continueNow) {
        console.log(chalk.yellow('\nSetup paused. After switching Node version, run: npm run setup\n'));
        process.exit(0);
      }
      return false;
    }

    // Verify new version
    const verifyCmd = `bash -l -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm use ${recommendedVersion} >/dev/null 2>&1 && node --version'`;
    const verifyResult = await runCommand(verifyCmd, { silent: true });
    
    if (verifyResult.success && verifyResult.output) {
      const newVersion = verifyResult.output.trim();
      console.log(chalk.green(`\n   ✅ Switched to Node.js ${newVersion}`));
      console.log(chalk.yellow('   ⚠️  Note: You may need to restart your terminal for changes to persist'));
      console.log(chalk.gray(`      Or run: source ~/.nvm/nvm.sh && nvm use ${recommendedVersion}\n`));
      return true;
    } else {
      // Check if version is installed even if we can't verify switch
      const checkInstalledCmd = `bash -l -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && nvm list ${recommendedVersion} 2>/dev/null | grep -q "${recommendedVersion}" && echo "installed"'`;
      const checkInstalled = await runCommand(checkInstalledCmd, { silent: true });
      
      if (checkInstalled.success) {
        const currentVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        console.log(chalk.green(`\n   ✅ Node.js ${recommendedVersion} installed!`));
        console.log(chalk.yellow(`   ⚠️  Current version: ${currentVersion} (not switched yet)`));
        console.log(chalk.yellow('   💡 Run in your terminal to switch:'));
        console.log(chalk.gray(`      source ~/.nvm/nvm.sh`));
        console.log(chalk.gray(`      nvm use ${recommendedVersion}\n`));
      } else {
        console.log(chalk.yellow(`\n   ⚠️  Installation status unclear`));
        console.log(chalk.gray(`      Please check manually: nvm list\n`));
      }
      return false; // Not fully switched in this process
    }
  } catch (error: any) {
    console.log(chalk.yellow('\n   ⚠️  Could not auto-switch. Please run manually:'));
    console.log(chalk.gray(`      nvm install ${recommendedVersion}`));
    console.log(chalk.gray(`      nvm use ${recommendedVersion}\n`));
    return false;
  }
}

async function checkPrerequisites() {
  const results = {
    node: checkCommand('node'),
    npm: checkCommand('npm'),
    supabase: checkCommand('supabase'),
    docker: checkCommand('docker'),
    allGood: true,
    warnings: [] as string[],
  };

  console.log(chalk.cyan('📋 Checking your system setup...'));
  console.log(chalk.gray('   Making sure you have everything needed to run this project\n'));

  // Check Node.js version (require 18.17+, recommend 20+, warn about 21+)
  if (results.node) {
    const versionString = execSync('node --version', { encoding: 'utf8' }).trim();
    const version = versionString.replace('v', '');
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1] || '0');
    
    // Check .nvmrc for recommended version
    let recommendedVersion = '20.18.0';
    try {
      const nvmrcPath = path.join(ROOT, '.nvmrc');
      if (fs.existsSync(nvmrcPath)) {
        recommendedVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
      }
    } catch {
      // Ignore if .nvmrc doesn't exist
    }
    
    let needsFix = false;
    let isCritical = false;
    
    if (major >= 21) {
      console.log(chalk.yellow(`  ⚠️  Node.js: ${versionString} (too new - may cause compatibility issues)`));
      console.log(chalk.yellow(`     Recommended: v${recommendedVersion} (see .nvmrc)`));
      needsFix = true;
      results.warnings.push(`Node.js ${versionString} is newer than recommended. Use v${recommendedVersion} for best compatibility.`);
    } else if (major === 20) {
      console.log(chalk.green(`  ✅ Node.js: ${versionString} (recommended)`));
    } else if (major === 18 && minor >= 17) {
      console.log(chalk.yellow(`  ⚠️  Node.js: ${versionString} (works, but v20+ recommended)`));
      console.log(chalk.gray('     Next.js 16 works best with Node.js 20+'));
    } else if (major >= 18) {
      console.log(chalk.yellow(`  ⚠️  Node.js: ${versionString} (needs 18.17+ or 20+ recommended)`));
      console.log(chalk.gray(`     Recommended: v${recommendedVersion}`));
      needsFix = true;
    } else {
      console.log(chalk.red(`  ❌ Node.js: ${versionString} (too old)`));
      console.log(chalk.yellow('     Next.js 16 requires Node.js 18.17 or higher'));
      console.log(chalk.yellow(`     Recommended: v${recommendedVersion}`));
      needsFix = true;
      isCritical = true;
      results.allGood = false;
    }

    // Auto-fix if needed
    if (needsFix) {
      const fixed = await fixNodeVersion(recommendedVersion);
      if (fixed) {
        // Re-check version after fix
        const newVersionString = execSync('node --version', { encoding: 'utf8' }).trim();
        const newVersion = newVersionString.replace('v', '');
        const newMajor = parseInt(newVersion.split('.')[0]);
        if (newMajor === 20 || (newMajor === 18 && parseInt(newVersion.split('.')[1] || '0') >= 17)) {
          console.log(chalk.green(`  ✅ Node.js version fixed: ${newVersionString}\n`));
          results.allGood = !isCritical; // If it was critical, still mark as good if fixed
        }
      } else {
        // Fix not available or user declined - ask if they want to continue
        const continueMessage = isCritical 
          ? 'Node.js version is incompatible. Continue anyway? (Not recommended)'
          : `Node.js ${versionString} may cause compatibility issues. Continue anyway?`;
        
        const { continueAnyway } = await prompts({
          type: 'confirm',
          name: 'continueAnyway',
          message: continueMessage,
          initial: !isCritical, // Allow continuing for non-critical (21+), but warn
        });
        
        if (!continueAnyway) {
          console.log(chalk.yellow('\nSetup cancelled. Please fix Node.js version and try again.'));
          console.log(chalk.gray(`   Recommended: Install Node.js ${recommendedVersion}`));
          console.log(chalk.gray('   Install nvm: https://github.com/nvm-sh/nvm'));
          console.log(chalk.gray(`   Or download: https://nodejs.org/\n`));
          process.exit(0);
        } else {
          console.log(chalk.yellow(`\n   ⚠️  Continuing with Node.js ${versionString} (may have compatibility issues)\n`));
        }
      }
    }
  } else {
    console.log(chalk.red('  ❌ Node.js: Not found'));
    console.log(chalk.yellow('     Install from: https://nodejs.org/'));
    results.allGood = false;
  }

  // Check npm version (require 9+)
  if (results.npm) {
    const versionString = execSync('npm --version', { encoding: 'utf8' }).trim();
    const major = parseInt(versionString.split('.')[0]);
    
    if (major >= 9) {
      console.log(chalk.green(`  ✅ npm: v${versionString}`));
    } else {
      console.log(chalk.yellow(`  ⚠️  npm: v${versionString} (outdated, v9+ recommended)`));
      console.log(chalk.gray('     Update with: npm install -g npm@latest'));
    }
  } else {
    console.log(chalk.red('  ❌ npm: Not found'));
    results.allGood = false;
  }

  // Check Docker (required for Supabase local)
  const dockerSpinner = createSpinner('Checking Docker...');
  dockerSpinner.start();
  if (results.docker) {
    try {
      const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
      const dockerPs = execSync('docker ps', { encoding: 'utf8', stdio: 'pipe' });
      dockerSpinner.stop(true, `Docker: ${dockerVersion.split(',')[0]} (running)`);
    } catch {
      dockerSpinner.stop(false, 'Docker: Installed but not running');
      results.warnings.push('Docker is installed but not running. Start Docker Desktop before continuing.');
      console.log(chalk.yellow('     ⚠️  Docker must be running for Supabase local setup'));
    }
  } else {
    dockerSpinner.stop(false, 'Docker: Not found');
    results.warnings.push('Docker not found. Required for Supabase local setup.');
    console.log(chalk.yellow('     Install: https://www.docker.com/products/docker-desktop'));
  }

  // Check Supabase CLI
  if (results.supabase) {
    try {
      const version = execSync('supabase --version', { encoding: 'utf8' }).trim();
      console.log(chalk.green(`  ✅ Supabase CLI: ${version}`));
    } catch {
      console.log(chalk.yellow('  ⚠️  Supabase CLI: Found but version check failed'));
    }
  } else {
    console.log(chalk.yellow('  ⚠️  Supabase CLI: Not found'));
    console.log(chalk.gray('     Install with: npm install -g supabase'));
    console.log(chalk.gray('     Or: brew install supabase/tap/supabase'));
    console.log(chalk.gray('     We can install it for you if needed.\n'));
  }

  // Check disk space
  const diskSpinner = createSpinner('Checking if you have enough storage space...');
  diskSpinner.start();
  const diskCheck = await checkDiskSpace();
  if (diskCheck.available) {
    diskSpinner.stop(true, `Storage: ${diskCheck.message} (plenty of space!)`);
  } else {
    diskSpinner.stop(false, `Storage: ${diskCheck.message}`);
    results.warnings.push(diskCheck.message);
    console.log(chalk.yellow('     💡 You need at least 2GB free for Docker images'));
  }

  // Check port availability (for Supabase)
  console.log(chalk.gray('\n   Checking if database ports are available...'));
  const portSpinner = createSpinner('Making sure ports are free for the database...');
  portSpinner.start();
  const ports = [54321, 54322, 54323];
  const portIssues: number[] = [];
  for (const port of ports) {
    const available = await checkPortAvailable(port);
    if (!available) {
      portIssues.push(port);
    }
  }
  if (portIssues.length === 0) {
    portSpinner.stop(true, 'Database ports: Ready to use');
  } else {
    portSpinner.stop(false, `Database ports: Already in use`);
    results.warnings.push(`Ports ${portIssues.join(', ')} are in use. Supabase may fail to start.`);
    console.log(chalk.yellow('     💡 These ports are needed for your local database.'));
    console.log(chalk.gray('        If Supabase is already running, that\'s fine!'));
    console.log(chalk.gray('        Otherwise, you may need to stop other services.\n'));
  }

  // Verify package.json versions
  try {
    const packageJson = await fs.readJson(path.join(ROOT, 'package.json'));
    console.log(chalk.cyan('\n  📦 Package Versions:'));
    console.log(chalk.gray(`     Next.js: ${packageJson.dependencies.next || 'not found'}`));
    console.log(chalk.gray(`     React: ${packageJson.dependencies.react || 'not found'}`));
    
    // Validate versions
    const nextVersion = packageJson.dependencies.next;
    if (nextVersion && !nextVersion.includes('16')) {
      console.log(chalk.red('  ❌ Next.js version mismatch! Expected 16.x'));
      results.allGood = false;
    }
  } catch (error) {
    console.log(chalk.yellow('  ⚠️  Could not verify package.json versions'));
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
    { title: 'OpenAI (AI)', value: 'openai', selected: false },
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

  return { selected: new Set<string>(response.modules || []) };
}

async function selectAuthProvider() {
  console.log(chalk.cyan('💡 Recommended for Prototyping: Mock Auth + SQLite'));
  console.log(chalk.gray('   ⚡ Instant setup, no Docker, works offline'));
  console.log(chalk.gray('   🚀 Perfect for building UI and testing logic'));
  console.log(chalk.gray('   🔄 Switch to real auth (Supabase Cloud) when ready to deploy\n'));

  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Which auth provider do you want to use?',
    choices: [
      { 
        title: '⚡ Mock Auth + SQLite (RECOMMENDED for prototyping)', 
        description: 'Instant setup, no Docker, login with test@example.com / Test123',
        value: 'mock' 
      },
      { 
        title: '☁️  Supabase Cloud (Production-ready - no Docker)', 
        description: 'Real auth + cloud database, requires free Supabase account',
        value: 'supabase-cloud' 
      },
      { 
        title: 'Supabase Local (Advanced - requires Docker)', 
        description: 'Full Supabase locally, needs Docker Desktop running',
        value: 'supabase' 
      },
      { title: 'Firebase Auth', value: 'firebase' },
      { title: 'Custom/Other (Clerk, Auth0, etc.)', value: 'custom' },
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

async function configureSQLite() {
  console.log(chalk.cyan('\n⚡ Setting up SQLite for fast prototyping...'));
  console.log(chalk.green('   ✅ No Docker required'));
  console.log(chalk.green('   ✅ No cloud account needed'));
  console.log(chalk.green('   ✅ Instant startup'));
  console.log(chalk.gray('   📝 Creates a local dev.db file in your project\n'));
  
  return {
    setupType: 'sqlite',
    url: '',
    anonKey: '',
    serviceKey: '',
    databaseUrl: 'file:./dev.db',
  };
}

async function configureSupabase() {
  console.log(chalk.cyan('\n💡 Database Setup Options:'));
  console.log(chalk.gray('   ⚡ Cloud: FASTEST for prototyping (no Docker, instant setup, free tier)'));
  console.log(chalk.gray('   💻 Local: Works offline (requires Docker, slow first time ~2-3 min)'));
  console.log(chalk.gray('   💡 Tip: Cloud is fastest for quick prototyping. Local is better for offline work.\n'));
  
  const { setupType } = await prompts({
    type: 'select',
    name: 'setupType',
    message: 'How do you want to set up your database?',
    choices: [
      { 
        title: '⚡ Cloud Project (FASTEST - No Docker needed)', 
        description: 'Instant setup, free tier, perfect for prototyping. Just need Supabase account.',
        value: 'cloud' 
      },
      { 
        title: '💻 Local Development (Works offline, requires Docker)', 
        description: 'First time: ~2-3 min download. After that: instant. Needs Docker Desktop running.',
        value: 'local' 
      },
      { title: '⏭️  Skip for now (Configure later)', value: 'skip' },
    ],
    initial: 0, // Default to cloud (fastest)
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
  console.log(chalk.cyan('\n🗄️  Setting up your local database...'));
  console.log(chalk.gray('   This creates a database on your computer for development\n'));

  // Check if Supabase CLI is installed
  console.log(chalk.blue('📦 Checking if database tools are installed...'));
  if (!checkCommand('supabase')) {
    console.log(chalk.yellow('⚠️  Supabase CLI not found'));
    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Supabase CLI not found. Install it now? (requires npm)',
      initial: true,
    });

    if (install) {
      console.log(chalk.blue('\n📥 Installing Supabase CLI (this may take a moment)...'));
      const result = await runCommand('npm install -g supabase', { silent: true });
      if (!result.success) {
        console.log(chalk.red('❌ Failed to install Supabase CLI. Please install manually.'));
        return await setupLocalSupabase();
      }
      console.log(chalk.green('✅ Supabase CLI installed\n'));
    } else {
      console.log(chalk.yellow('Please install Supabase CLI and run setup again.'));
      process.exit(0);
    }
  } else {
    console.log(chalk.green('✅ Supabase CLI is installed\n'));
  }

  // Check if Supabase is already running (this handles port conflicts)
  console.log(chalk.blue('🔍 Checking if database is already running...'));
  console.log(chalk.gray('   Looking for an existing database server on your computer\n'));
  const statusResult = await runCommand('supabase status', { silent: true });
  const output = statusResult.output || '';
  const isRunning = statusResult.success && (output.includes('API URL') || output.includes('Started'));
  
  // If ports are in use, Supabase might already be running
  if (!isRunning && output.includes('54321') || output.includes('54322') || output.includes('54323')) {
    console.log(chalk.yellow('⚠️  Database ports are in use - checking if database is already running...'));
    // Try to get status with more verbose output
    const verboseStatus = await runCommand('supabase status --output json', { silent: true });
    if (verboseStatus.success) {
      console.log(chalk.green('✅ Database appears to be running already (that\'s fine!)\n'));
      // Continue as if running
    }
  }

  if (isRunning) {
    console.log(chalk.green('✅ Database is already running locally!'));
    console.log(chalk.gray('   💡 Great! No setup needed - using existing database\n'));
    
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

  console.log(chalk.gray('   Supabase is not running, starting it now...\n'));

  // Check if Supabase needs initialization
  console.log(chalk.blue('🔧 Checking database configuration...'));
  console.log(chalk.gray('   Making sure database is set up for this project\n'));
  const initCheck = await runCommand('supabase status', { silent: true });
  const needsInit = !initCheck.success || initCheck.output?.includes('not found') || initCheck.output?.includes('not initialized');

  if (needsInit) {
    console.log(chalk.yellow('⚠️  Database not configured for this project yet'));
    const { init } = await prompts({
      type: 'confirm',
      name: 'init',
      message: 'Set up database configuration files? (Creates supabase/ folder)',
      initial: true,
    });

    if (init) {
      console.log(chalk.blue('\n📝 Initializing Supabase project...'));
      const initResult = await runCommand('supabase init');
      if (!initResult.success) {
        console.log(chalk.red('❌ Failed to initialize Supabase.\n'));
        
        // Provide helpful error analysis
        const error = initResult.error || initResult.output || '';
        if (error.includes('already initialized') || error.includes('config.toml')) {
          console.log(chalk.yellow('   ℹ️  Supabase may already be initialized in this directory.'));
          console.log(chalk.gray('   Continuing with existing configuration...\n'));
        } else {
          console.log(chalk.yellow('   Error:', error.substring(0, 200)));
          console.log(chalk.gray('   You can try manually: supabase init\n'));
        }
        
        // Check if config.toml exists anyway
        const configPath = path.join(ROOT, 'supabase', 'config.toml');
        if (await fs.pathExists(configPath)) {
          console.log(chalk.green('✅ Found existing Supabase configuration, continuing...\n'));
        } else {
          return {
            setupType: 'local',
            url: 'http://127.0.0.1:54321',
            anonKey: '',
            serviceKey: '',
            databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
          };
        }
      } else {
        console.log(chalk.green('✅ Supabase project initialized\n'));
      }
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

  // Comprehensive Docker check with visibility
  console.log(chalk.blue('🐳 Checking Docker (required for database)...'));
  console.log(chalk.gray('   Docker runs the database in a container on your computer\n'));
  const dockerSpinner = createSpinner('Making sure Docker is ready...');
  dockerSpinner.start();
  
  const dockerCheck = await runCommand('docker ps', { silent: true });
  if (!dockerCheck.success) {
    dockerSpinner.stop(false, 'Docker is not running');
    console.log(chalk.red('\n❌ Docker Desktop is not running'));
    console.log(chalk.yellow('   Your database needs Docker to run.'));
    console.log(chalk.gray('\n   What to do:'));
    console.log(chalk.gray('   1. Open Docker Desktop app (look for whale icon)'));
    console.log(chalk.gray('   2. Wait until it says "Docker is running"'));
    console.log(chalk.gray('   3. Come back here and we\'ll try again\n'));
    
    const { retry } = await prompts({
      type: 'confirm',
      name: 'retry',
      message: 'Would you like to retry after starting Docker?',
      initial: true,
    });
    
    if (retry) {
      return await setupLocalSupabase(); // Retry
    }
    
    return {
      setupType: 'local',
      url: 'http://127.0.0.1:54321',
      anonKey: '',
      serviceKey: '',
      databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    };
  }
  
  // Check Docker resources and show container status
  try {
    const dockerInfo = await runCommand('docker info', { silent: true });
    dockerSpinner.stop(true, 'Docker is running and ready');
    
    // Show current Docker containers
    const containersResult = await runCommand('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', { silent: true });
    if (containersResult.success && containersResult.output && containersResult.output.trim().length > 0) {
      console.log(chalk.gray('\n   📦 Current Docker containers:'));
      const lines = containersResult.output.trim().split('\n').slice(1); // Skip header
      if (lines.length > 0) {
        lines.forEach(line => {
          const parts = line.split('\t');
          if (parts[0] && parts[0].includes('supabase')) {
            console.log(chalk.green(`      ✅ ${parts[0]} - ${parts[1] || 'running'}`));
          }
        });
      }
    }
    
    // Check if Supabase images are already cached (optimization)
    console.log(chalk.gray('\n   🔍 Checking if Supabase images are cached...'));
    const imagesResult = await runCommand('docker images --format "{{.Repository}}:{{.Tag}}" | grep supabase', { silent: true });
    if (imagesResult.success && imagesResult.output && imagesResult.output.trim().length > 0) {
      const imageCount = imagesResult.output.trim().split('\n').filter(l => l.includes('supabase')).length;
      if (imageCount > 0) {
        console.log(chalk.green(`      ✅ Found ${imageCount} cached Supabase image(s) - startup will be faster!`));
      } else {
        console.log(chalk.yellow('      ⏳ No cached images - first-time download required (~500MB)'));
      }
    } else {
      console.log(chalk.yellow('      ⏳ No cached images - first-time download required (~500MB)'));
    }
    console.log(); // Empty line
  } catch {
    dockerSpinner.stop(true, 'Docker is running');
  }

  // Start Supabase with smart progress display
  console.log(chalk.blue('\n🚀 Starting your local database...'));
  console.log(chalk.gray('   💡 First time: Downloads ~500MB (typically 2-3 minutes)'));
  console.log(chalk.gray('   ✅ Subsequent starts: Instant (no download needed)'));
  console.log(chalk.gray('   📊 Showing progress below...'));
  console.log(chalk.gray('   💡 Tip: Check Docker Desktop to see containers being created\n'));
  
  const startResult = await runCommandWithOutput('supabase start', { 
    timeout: 10 * 60 * 1000, // 10 minute timeout
    quiet: false // Use smart progress display
  });

  if (!startResult.success) {
    console.log(chalk.red('\n❌ Failed to start Supabase locally.\n'));
    
    // Provide helpful error analysis
    const error = startResult.error || '';
    const output = startResult.output || '';
    
    if (error.includes('timeout') || error.includes('timed out')) {
      console.log(chalk.yellow('   ⏱️  Timeout: The process took too long.'));
      console.log(chalk.gray('   This usually means Docker is downloading images (slow network) or containers are starting.'));
      console.log(chalk.gray('   Try running manually: supabase start\n'));
    } else if (error.includes('port') || output.includes('port')) {
      console.log(chalk.yellow('   🔌 Port conflict: A port is already in use.'));
      console.log(chalk.gray('   Check if Supabase is already running: supabase status'));
      console.log(chalk.gray('   Or stop other services using ports 54321-54323\n'));
    } else if (error.includes('permission') || error.includes('denied')) {
      console.log(chalk.yellow('   🔒 Permission issue: Docker may need elevated permissions.'));
      console.log(chalk.gray('   Try: sudo docker ps (Linux) or ensure Docker Desktop has proper permissions\n'));
    } else {
      console.log(chalk.yellow(`   Error details: ${error.substring(0, 200)}`));
      console.log(chalk.gray('\n   Troubleshooting steps:'));
      console.log(chalk.gray('   1. Check Docker is running: docker ps'));
      console.log(chalk.gray('   2. Try manually: supabase start'));
      console.log(chalk.gray('   3. Check logs: supabase logs'));
      console.log(chalk.gray('   4. Reset if needed: supabase stop && supabase start\n'));
    }
    
    const { retry } = await prompts({
      type: 'confirm',
      name: 'retry',
      message: 'Would you like to retry starting Supabase?',
      initial: false,
    });
    
    if (retry) {
      return await setupLocalSupabase();
    }
    
    return {
      setupType: 'local',
      url: 'http://127.0.0.1:54321',
      anonKey: '',
      serviceKey: '',
      databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    };
  }
  
  console.log(chalk.green('\n✅ Supabase started successfully!\n'));

  // Show Docker containers that were created
  console.log(chalk.blue('📦 Verifying Docker containers...'));
  const containersCheck = await runCommand('docker ps --filter "name=supabase" --format "{{.Names}}"', { silent: true });
  if (containersCheck.success && containersCheck.output) {
    const containerNames = containersCheck.output.trim().split('\n').filter(n => n.length > 0);
    if (containerNames.length > 0) {
      console.log(chalk.green(`   ✅ ${containerNames.length} Supabase container(s) running:`));
      containerNames.forEach(name => {
        console.log(chalk.gray(`      • ${name}`));
      });
      console.log();
    }
  }

  // Verify Supabase is actually running and accessible
  const verifySpinner = createSpinner('Verifying Supabase is running...');
  verifySpinner.start();
  
  // Wait a moment for services to fully start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get status again to extract values
  const statusResult2 = await runCommand('supabase status');
  const statusOutput = statusResult2.output || '';
  
  if (!statusResult2.success || !statusOutput.includes('API URL')) {
    verifySpinner.stop(false, 'Supabase started but status check failed');
    console.log(chalk.yellow('   ⚠️  Supabase may still be starting. Waiting a bit longer...\n'));
    await new Promise(resolve => setTimeout(resolve, 5000));
    const retryStatus = await runCommand('supabase status');
    if (retryStatus.success && retryStatus.output?.includes('API URL')) {
      verifySpinner.stop(true, 'Supabase is running');
    } else {
      verifySpinner.stop(false, 'Could not verify Supabase status');
      console.log(chalk.yellow('   ⚠️  Continuing anyway - you can check manually with: supabase status\n'));
    }
  } else {
    verifySpinner.stop(true, 'Supabase is running');
  }
  
  // Try multiple patterns to extract values (Supabase CLI output can vary)
  const urlMatch = statusOutput.match(/API URL[:\s]+(https?:\/\/[^\s\n]+)/i) || 
                   statusOutput.match(/API URL:\s*(https?:\/\/[^\s]+)/);
  const anonKeyMatch = statusOutput.match(/anon key[:\s]+([^\s\n]+)/i) || 
                      statusOutput.match(/anon key:\s*([^\s]+)/);
  const serviceKeyMatch = statusOutput.match(/service_role key[:\s]+([^\s\n]+)/i) || 
                         statusOutput.match(/service_role key:\s*([^\s]+)/);
  const dbUrlMatch = statusOutput.match(/DB URL[:\s]+(postgresql:\/\/[^\s\n]+)/i) || 
                    statusOutput.match(/DB URL:\s*(postgresql:\/\/[^\s]+)/);

  console.log(chalk.green('\n✅ Supabase is running locally\n'));

  // Show helpful Docker info
  console.log(chalk.cyan('💡 Docker Tips:'));
  console.log(chalk.gray('   • View containers: docker ps'));
  console.log(chalk.gray('   • View logs: docker logs supabase_db_<project-id>'));
  console.log(chalk.gray('   • Stop Supabase: supabase stop'));
  console.log(chalk.gray('   • Open Docker Desktop to see all containers\n'));

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
  } else {
    console.log(chalk.green('✅ Configuration extracted successfully\n'));
  }

  return config;
}

async function setupCloudSupabase() {
  console.log(chalk.cyan('\n⚡ Setting up Supabase Cloud (FASTEST option)...'));
  console.log(chalk.green('   ✅ No Docker needed - instant setup!'));
  console.log(chalk.gray('   ✅ Free tier available - perfect for prototyping'));
  console.log(chalk.gray('   ✅ Just need a Supabase account (free)\n'));
  
  // Check if Supabase CLI is logged in
  const loginCheck = await runCommand('supabase projects list', { silent: true });
  const isLoggedIn = loginCheck.success && !loginCheck.output?.includes('not logged in');
  
  if (!isLoggedIn) {
    console.log(chalk.yellow('📝 You need to log in to Supabase CLI first:'));
    console.log(chalk.gray('   This lets us create or link projects automatically\n'));
    
    const { login } = await prompts({
      type: 'confirm',
      name: 'login',
      message: 'Log in to Supabase CLI now? (Opens browser)',
      initial: true,
    });
    
    if (login) {
      console.log(chalk.blue('\n🔐 Logging in to Supabase...'));
      const loginResult = await runCommandWithOutput('supabase login', { timeout: 2 * 60 * 1000 });
      if (!loginResult.success) {
        console.log(chalk.red('\n❌ Login failed.'));
        console.log(chalk.yellow('   You can manually enter credentials instead.\n'));
      } else {
        console.log(chalk.green('✅ Logged in successfully!\n'));
      }
    }
  }
  
  // Ask if they want to create new or link existing
  const { projectAction } = await prompts({
    type: 'select',
    name: 'projectAction',
    message: 'What would you like to do?',
    choices: [
      { title: '🆕 Create a new Supabase project (via CLI)', value: 'create' },
      { title: '🔗 Link to existing project', value: 'link' },
      { title: '📝 Enter credentials manually', value: 'manual' },
    ],
    initial: 0,
  });
  
  if (projectAction === 'create') {
    return await createCloudProject();
  } else if (projectAction === 'link') {
    return await linkCloudProject();
  } else {
    return await setupCloudSupabaseManual();
  }
}

async function createCloudProject() {
  console.log(chalk.blue('\n🆕 Creating new Supabase project...'));
  console.log(chalk.gray('   This will create a project in your Supabase account\n'));
  
  const { projectName } = await prompts({
    type: 'text',
    name: 'projectName',
    message: 'Project name:',
    initial: path.basename(ROOT),
    validate: (value) => value.length > 0 || 'Project name is required',
  });
  
  const { dbPassword } = await prompts({
    type: 'password',
    name: 'dbPassword',
    message: 'Database password (save this!):',
    validate: (value) => value.length >= 8 || 'Password must be at least 8 characters',
  });
  
  const { region } = await prompts({
    type: 'select',
    name: 'region',
    message: 'Region (choose closest to you):',
    choices: [
      { title: 'US West (Oregon)', value: 'us-west-1' },
      { title: 'US East (Virginia)', value: 'us-east-1' },
      { title: 'EU West (Ireland)', value: 'eu-west-1' },
      { title: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
    ],
    initial: 0,
  });
  
  console.log(chalk.blue('\n🚀 Creating project (this takes ~2 minutes)...'));
  const createSpinner = createSpinner('Creating Supabase project...');
  createSpinner.start();
  
  // Note: supabase projects create requires API token, not CLI login
  // For now, guide user to create manually, then link
  createSpinner.stop(false, 'Project creation via CLI requires API token');
  console.log(chalk.yellow('\n⚠️  Auto-creation requires Supabase API token.'));
  console.log(chalk.gray('   For now, please create project manually, then we\'ll link it.\n'));
  
  return await linkCloudProject();
}

async function linkCloudProject() {
  console.log(chalk.blue('\n🔗 Linking to existing Supabase project...'));
  
  // List available projects
  const projectsResult = await runCommand('supabase projects list', { silent: true });
  if (projectsResult.success && projectsResult.output) {
    console.log(chalk.gray('\nYour Supabase projects:'));
    console.log(chalk.gray(projectsResult.output));
  }
  
  const { projectRef } = await prompts({
    type: 'text',
    name: 'projectRef',
    message: 'Project Reference ID (from projects list above):',
    validate: (value) => value.length > 0 || 'Project reference is required',
  });
  
  console.log(chalk.blue('\n🔗 Linking project...'));
  const linkResult = await runCommand(`supabase link --project-ref ${projectRef}`, { silent: true });
  
  if (!linkResult.success) {
    console.log(chalk.red('❌ Failed to link project.'));
    console.log(chalk.yellow('   Falling back to manual entry...\n'));
    return await setupCloudSupabaseManual();
  }
  
  // Get status to extract credentials
  const statusResult = await runCommand('supabase status', { silent: true });
  // Parse remote project details
  // For now, fall back to manual entry
  return await setupCloudSupabaseManual();
}

async function setupCloudSupabaseManual() {
  console.log(chalk.cyan('\n📋 Enter your Supabase project credentials:'));
  console.log(chalk.gray('   Find these in: Project Settings → API\n'));
  
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

  // Ask for database connection string
  console.log(chalk.cyan('\n📋 Database Connection:'));
  console.log(chalk.gray('   Find this in: Project Settings → Database → Connection String'));
  console.log(chalk.gray('   Use the "URI" format (starts with postgresql://)\n'));
  
  const { databaseUrl } = await prompts({
    type: 'password',
    name: 'databaseUrl',
    message: 'Database Connection String (URI):',
    validate: (value) => {
      if (!value || value.length === 0) return 'Database URL is required';
      if (!value.startsWith('postgresql://')) return 'Must start with postgresql://';
      return true;
    },
  });

  console.log(chalk.green('\n✅ Cloud database configured!'));
  console.log(chalk.gray('   Your app will connect to Supabase Cloud\n'));

  return {
    setupType: 'cloud',
    url,
    anonKey,
    serviceKey,
    databaseUrl,
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

  // Update package.json scripts for Expo (use npx expo)
  const packageJsonPath = path.join(ROOT, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const pkg = await fs.readJSON(packageJsonPath);
    if (!pkg.scripts['expo:start']) {
      pkg.scripts = {
        ...pkg.scripts,
        'expo:start': 'npx expo start',
        'expo:android': 'npx expo start --android',
        'expo:ios': 'npx expo start --ios',
        'expo:web': 'npx expo start --web',
      };
      await fs.writeJSON(packageJsonPath, pkg, { spaces: 2 });
    }
    
    // Install Expo dependencies if not present
    const expoDeps = ['expo', 'expo-router', 'react-native', 'react-native-web', 'react-native-reanimated', 'nativewind'];
    const needsExpo = expoDeps.some(dep => !pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]);
    
    if (needsExpo) {
      console.log(chalk.blue('\n📦 Installing Expo dependencies...'));
      console.log(chalk.gray('   This may take a minute...\n'));
      
      const installSpinner = createSpinner('Installing Expo packages...');
      installSpinner.start();
      
      // Add Expo dependencies
      if (!pkg.dependencies) pkg.dependencies = {};
      pkg.dependencies['expo'] = '~52.0.0';
      pkg.dependencies['expo-router'] = '~4.0.0';
      pkg.dependencies['react-native'] = '0.76.0';
      pkg.dependencies['react-native-web'] = '~0.19.13';
      pkg.dependencies['react-native-reanimated'] = '~3.16.1';
      pkg.dependencies['nativewind'] = '^4.0.1';
      
      // Add dev dependencies
      if (!pkg.devDependencies) pkg.devDependencies = {};
      pkg.devDependencies['@expo/metro-runtime'] = '~4.0.0';
      pkg.devDependencies['babel-preset-expo'] = '~11.0.0';
      
      // Add ajv (required by expo-router)
      if (!pkg.dependencies['ajv']) {
        pkg.dependencies['ajv'] = '^8.12.0';
      }
      
      await fs.writeJSON(packageJsonPath, pkg, { spaces: 2 });
      
      // Install the packages
      const installResult = await runCommandWithOutput('npm install', { timeout: 5 * 60 * 1000 });
      
      if (installResult.success) {
        installSpinner.stop(true, 'Expo dependencies installed');
      } else {
        installSpinner.stop(false, 'Failed to install Expo dependencies');
        console.log(chalk.yellow('⚠️  You may need to run "npm install" manually\n'));
      }
    } else {
      console.log(chalk.green('✅ Expo dependencies are already installed\n'));
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

  const modules = ['mux', 'twilio', 'elevenlabs', 'stripe', 'openai'];
  
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

  const envExamplePath = path.join(ROOT, '.env.example');
  
  // Create .env.example if it doesn't exist
  if (!await fs.pathExists(envExamplePath)) {
    console.log(chalk.blue('📝 Creating .env.example template...'));
    await createEnvExampleFile();
    console.log(chalk.green('✅ Created .env.example\n'));
  }

  let content = await fs.readFile(envExamplePath, 'utf8');

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
  if (!keep.has('openai')) {
    content = content.replace(/# --- OPENAI START ---[\s\S]*?# --- OPENAI END ---/g, '');
  }

  // Handle different auth providers
  if (authConfig.provider === 'mock') {
    // SQLite + Mock Auth
    content = content.replace(/DATABASE_URL=.*/g, 'DATABASE_URL=file:./dev.db');
    content = content.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, '');
    content = content.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, '');
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, '');
    
    // Add mock auth indicator
    if (!content.includes('AUTH_PROVIDER')) {
      content = 'AUTH_PROVIDER=mock\n' + content;
    }
  } else if (authConfig.provider === 'supabase' && supabaseConfig) {
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

async function createEnvExampleFile() {
  const content = `# --- CORE CONFIG ---
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# --- STRIPE START ---
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# --- STRIPE END ---

# --- MUX START ---
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
# --- MUX END ---

# --- TWILIO START ---
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
# --- TWILIO END ---

# --- ELEVENLABS START ---
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
# --- ELEVENLABS END ---

# --- OPENAI START ---
OPENAI_API_KEY=...
# --- OPENAI END ---

# --- INNGEST START ---
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local
# --- INNGEST END ---
`;
  await fs.writeFile(path.join(ROOT, '.env.example'), content);
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
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
# --- ELEVENLABS END ---

`;
  }

  if (keep.has('openai')) {
    content += `# --- OPENAI START ---
OPENAI_API_KEY=...
# --- OPENAI END ---

`;
  }

  content += `# --- INNGEST START ---
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local
# --- INNGEST END ---
`;

  await fs.writeFile(path.join(ROOT, '.env.local'), content.trim());
}

async function setupSQLiteDatabase() {
  console.log(chalk.green('✅ Setting up SQLite (instant - no Docker!)\n'));
  
  // SQLite setup is instant - no server needed
  console.log(chalk.blue('📝 Creating SQLite database file...'));
  
  // Check if drizzle config for SQLite exists
  const sqliteConfigPath = path.join(ROOT, 'drizzle.config.sqlite.ts');
  if (!await fs.pathExists(sqliteConfigPath)) {
    console.log(chalk.yellow('   ⚠️  SQLite config not found, using default Drizzle config'));
  }
  
  // Push schema using drizzle-kit (works with SQLite)
  console.log(chalk.blue('📦 Creating database tables...'));
  const pushResult = await runCommand('drizzle-kit push --config=drizzle.config.sqlite.ts', { silent: false });
  
  if (!pushResult.success) {
    console.log(chalk.yellow('   ⚠️  Could not auto-create tables'));
    console.log(chalk.gray('      You can create them manually later\n'));
    return { success: false, seeded: false };
  }
  
  console.log(chalk.green('✅ SQLite database ready!\n'));
  
  // Mock auth doesn't need seeding - it's already in memory
  console.log(chalk.cyan('📝 Mock Auth Credentials:'));
  console.log(chalk.white('   Email: test@example.com'));
  console.log(chalk.white('   Password: Test123\n'));
  console.log(chalk.gray('   (No database seeding needed - mock auth works out of the box)\n'));
  
  return { success: true, seeded: true };
}

async function setupDatabase(supabaseConfig: any) {
  if (supabaseConfig.setupType === 'skip') {
    console.log(chalk.yellow('⚠️  Skipping database setup. Run "npm run db:push" manually.\n'));
    return { success: false, seeded: false };
  }

  // Verify Supabase is still running
  const verifySpinner = createSpinner('Verifying Supabase connection...');
  verifySpinner.start();
  const statusCheck = await runCommand('supabase status', { silent: true });
  if (!statusCheck.success || !statusCheck.output?.includes('API URL')) {
    verifySpinner.stop(false, 'Supabase is not running');
    console.log(chalk.red('\n❌ Cannot connect to Supabase.'));
    console.log(chalk.yellow('   Please ensure Supabase is running: supabase start\n'));
    return { success: false, seeded: false };
  }
  verifySpinner.stop(true, 'Supabase connection verified');

  // Check if .env.local exists with DATABASE_URL
  const envPath = path.join(ROOT, '.env.local');
  if (await fs.pathExists(envPath)) {
    const envContent = await fs.readFile(envPath, 'utf8');
    if (!envContent.includes('DATABASE_URL=')) {
      console.log(chalk.yellow('⚠️  DATABASE_URL not found in .env.local'));
      console.log(chalk.gray('   Adding it now...\n'));
    }
  }

  const pushSpinner = createSpinner('Pushing database schema...');
  pushSpinner.start();
  
  // Push schema
  const pushResult = await runCommand('npm run db:push');
  
  if (!pushResult.success) {
    pushSpinner.stop(false, 'Failed to push schema');
    console.log(chalk.red('\n❌ Failed to push database schema.\n'));
    
    // Analyze error
    const error = pushResult.error || pushResult.output || '';
    if (error.includes('ECONNREFUSED') || error.includes('connection')) {
      console.log(chalk.yellow('   🔌 Connection error: Cannot connect to database.'));
      console.log(chalk.gray('   Ensure Supabase is running: supabase status'));
      console.log(chalk.gray('   Check DATABASE_URL in .env.local\n'));
    } else if (error.includes('permission') || error.includes('denied')) {
      console.log(chalk.yellow('   🔒 Permission error: Check database credentials.\n'));
    } else {
      console.log(chalk.yellow('   Error details:', error.substring(0, 200)));
      console.log(chalk.gray('\n   Try running manually: npm run db:push\n'));
    }
    
    const { retry } = await prompts({
      type: 'confirm',
      name: 'retry',
      message: 'Would you like to retry pushing the schema?',
      initial: false,
    });
    
    if (retry) {
      return await setupDatabase(supabaseConfig);
    }
    
    return { success: false, seeded: false };
  }

  pushSpinner.stop(true, 'Database schema pushed successfully');

  // Ask about seeding
  const { seed } = await prompts({
    type: 'confirm',
    name: 'seed',
    message: 'Seed database with test user? (test@example.com / Testing123)',
    initial: true,
  });

  if (seed) {
    const seedSpinner = createSpinner('Seeding database...');
    seedSpinner.start();
    
    const seedResult = await runCommand('npm run db:reset', { silent: true });
    
    if (seedResult.success) {
      seedSpinner.stop(true, 'Database seeded successfully');
      return { success: true, seeded: true };
    } else {
      seedSpinner.stop(false, 'Seeding had issues');
      console.log(chalk.yellow('⚠️  Seeding had issues, but schema is ready.'));
      console.log(chalk.gray('   You can seed manually: npm run db:seed\n'));
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
