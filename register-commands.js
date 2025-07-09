const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway commands')
    .addSubcommand(sub => 
      sub.setName('create')
        .setDescription('Start a giveaway')
        .addUserOption(opt => opt.setName('host').setDescription('Giveaway host').setRequired(true))
        .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 10m)').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to host in').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('reroll')
        .setDescription('Reroll a giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Original giveaway ID').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(opt => opt.setName('message_id').setDescription('Original giveaway ID').setRequired(true))
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
  .then(() => console.log('✅ Slash commands registered.'))
  .catch(console.error);
