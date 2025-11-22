import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const ROOT = process.cwd();

async function main() {
  console.log(chalk.cyan.bold('\n✨ Initializing Universal Vibe Setup...'));
  console.log(chalk.gray('   Select the modules you want to KEEP.\n'));

  const response = await prompts([
    {
      type: 'multiselect',
      name: 'modules',
      message: 'Which modules do you need?',
      choices: [
        { title: 'Stripe (Payments)', value: 'stripe', selected: true },
        { title: 'Mux (Video)', value: 'mux', selected: false },
        { title: 'Twilio (SMS/Voice)', value: 'twilio', selected: false },
        { title: 'ElevenLabs (AI Voice)', value: 'elevenlabs', selected: false },
        { title: 'Inngest (Background Jobs)', value: 'inngest', selected: true },
      ],
    },
  ]);

  const keep = new Set(response.modules);

  await prune('mux', keep);
  await prune('twilio', keep);
  await prune('elevenlabs', keep);
  await prune('stripe', keep);
  
  if (!keep.has('inngest')) {
    await fs.remove(path.join(ROOT, 'src/inngest'));
    await fs.remove(path.join(ROOT, 'src/app/api/inngest'));
    console.log(chalk.yellow(`   - Removed Inngest module`));
  }

  await generateEnv(keep);
  console.log(chalk.green.bold('\n✅ Setup Complete! Run "pnpm dev" to start.'));
}

async function prune(name, keep) {
  if (!keep.has(name)) {
    await fs.remove(path.join(ROOT, `src/services/${name}`));
    console.log(chalk.yellow(`   - Removed ${name} service`));
  }
}

async function generateEnv(keep) {
  const envPath = path.join(ROOT, '.env.example');
  if (!await fs.pathExists(envPath)) return;

  let content = await fs.readFile(envPath, 'utf8');
  
  if (!keep.has('mux')) content = content.replace(/# --- MUX START ---[\s\S]*?# --- MUX END ---/g, '');
  if (!keep.has('stripe')) content = content.replace(/# --- STRIPE START ---[\s\S]*?# --- STRIPE END ---/g, '');
  if (!keep.has('twilio')) content = content.replace(/# --- TWILIO START ---[\s\S]*?# --- TWILIO END ---/g, '');
  if (!keep.has('elevenlabs')) content = content.replace(/# --- ELEVENLABS START ---[\s\S]*?# --- ELEVENLABS END ---/g, '');
  
  await fs.writeFile(path.join(ROOT, '.env'), content.trim());
}

main().catch(console.error);