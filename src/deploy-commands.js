import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(join(commandsPath, file));
  if (command.default?.data) {
    commands.push(command.default.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

const target = process.env.GUILD_ID
  ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(process.env.CLIENT_ID);

try {
  console.log(`🔄 Deploying ${commands.length} slash command(s)...`);
  const data = await rest.put(target, { body: commands });
  console.log(`✅ Successfully deployed ${data.length} command(s).`);
} catch (error) {
  console.error(error);
}
