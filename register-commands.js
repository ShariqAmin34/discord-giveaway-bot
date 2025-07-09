const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const command = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new giveaway')
      .addUserOption(o => o.setName('host').setDescription('Giveaway host').setRequired(true))
      .addStringOption(o => o.setName('prize').setDescription('Prize name').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 1h, 30m)').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to send giveaway in').setRequired(true))
  );

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [command.toJSON()] }
    );
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
