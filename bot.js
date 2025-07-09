require("dotenv").config();
require("./keep_alive.js");

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  Collection,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");

const ms = require("ms");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

const giveaways = new Collection();

client.once("ready", async () => {
  console.log(`🎉 Logged in as ${client.user.tag}`);

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName("giveaway")
      .setDescription("Create or manage giveaways")
      .addSubcommand((sub) =>
        sub
          .setName("create")
          .setDescription("Start a new giveaway")
          .addUserOption((opt) =>
            opt
              .setName("host")
              .setDescription("Giveaway host")
              .setRequired(true),
          )
          .addStringOption((opt) =>
            opt.setName("prize").setDescription("Prize name").setRequired(true),
          )
          .addStringOption((opt) =>
            opt
              .setName("duration")
              .setDescription("Duration (e.g. 5m, 1h)")
              .setRequired(true),
          )
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Giveaway channel")
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName("reroll")
          .setDescription("Reroll a giveaway winner")
          .addStringOption((opt) =>
            opt
              .setName("message_id")
              .setDescription("Giveaway message ID")
              .setRequired(true),
          ),
      ),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands,
    });
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash commands
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "giveaway"
    ) {
      const sub = interaction.options.getSubcommand();

      // 🎉 Giveaway Create
      if (sub === "create") {
        const host = interaction.options.getUser("host");
        const prize = interaction.options.getString("prize");
        const duration = ms(interaction.options.getString("duration"));
        const channel = interaction.options.getChannel("channel");

        const endTime = Date.now() + duration;
        const giveawayId = `${Date.now()}_${Math.random().toFixed(6)}`;
        const participants = new Set();

        const embed = new EmbedBuilder()
          .setTitle(`🎉 Giveaway: ${prize}`)
          .setDescription(
            `Hosted by ${host}\nClick below to enter!\nEnds <t:${Math.floor(endTime / 1000)}:R>`,
          )
          .setColor("Random");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`join_${giveawayId}`)
            .setEmoji("🎉")
            .setLabel("Join Giveaway")
            .setStyle(ButtonStyle.Success),
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        giveaways.set(giveawayId, {
          messageId: msg.id,
          channelId: channel.id,
          participants,
          prize,
          host,
          endTime,
        });

        console.log("📦 Giveaway created with ID:", giveawayId);

        await interaction.reply({
          content: `✅ Giveaway started in ${channel}`,
          ephemeral: true,
        });

        // Timer to choose winner
        setTimeout(async () => {
          const data = giveaways.get(giveawayId);
          if (!data || data.participants.size === 0) {
            channel.send(`😕 No one joined the giveaway for **${prize}**`);
            giveaways.delete(giveawayId);
            return;
          }

          const arr = Array.from(data.participants);
          const winner = arr[Math.floor(Math.random() * arr.length)];
          await channel.send(
            `🎉🎉 Congratulations <@${winner}>! You won **${prize}** 🎁 hosted by ${host}`,
          );
          giveaways.delete(giveawayId);
        }, duration);
      }

      // 🔁 Giveaway Reroll
      if (sub === "reroll") {
        const messageId = interaction.options.getString("message_id");

        const found = Array.from(giveaways.values()).find(
          (g) => g.messageId === messageId,
        );

        if (!found || found.participants.size === 0) {
          await interaction.reply({
            content: "❌ Giveaway not found or no participants joined.",
            ephemeral: true,
          });
          return;
        }

        const arr = Array.from(found.participants);
        const newWinner = arr[Math.floor(Math.random() * arr.length)];

        await interaction.reply({
          content: `🔁 Rerolled! New winner: <@${newWinner}> 🎉`,
          ephemeral: false,
        });
      }
    }

    // 🎯 Button handler
    if (interaction.isButton()) {
      const [action, ...idParts] = interaction.customId.split("_");
      const id = idParts.join("_");

      console.log("🔘 Button clicked:", interaction.customId);
      console.log("🔍 Action:", action);
      console.log("🔍 Giveaway ID:", id);

      if (action === "join" && giveaways.has(id)) {
        const data = giveaways.get(id);
        data.participants.add(interaction.user.id);
        await interaction.reply({
          content: "✅ You have successfully joined the giveaway!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ This giveaway is no longer active or already ended.",
          ephemeral: true,
        });
      }
    }
  } catch (err) {
    console.error("❗ Error handling interaction:", err);
    if (!interaction.replied) {
      try {
        await interaction.reply({
          content: "⚠️ An error occurred while handling your command.",
          ephemeral: true,
        });
      } catch {
        console.error("❌ Failed to send error reply.");
      }
    }
  }
});

client.login(process.env.TOKEN);
