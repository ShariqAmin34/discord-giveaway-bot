require("dotenv").config();
require("./keep_alive.js");

const fs = require("fs");
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
  Routes
} = require("discord.js");

const ms = require("ms");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

const giveaways = new Collection();
let savedGiveaways = {};

function loadGiveaways() {
  if (fs.existsSync("giveaways.json")) {
    const data = fs.readFileSync("giveaways.json", "utf8");
    savedGiveaways = JSON.parse(data);
    for (const id in savedGiveaways) {
      const data = savedGiveaways[id];
      data.participants = new Set(data.participants);
      giveaways.set(id, data);
    }
  }
}

function saveGiveaways() {
  const obj = {};
  giveaways.forEach((data, id) => {
    obj[id] = {
      ...data,
      participants: [...data.participants],
    };
  });
  fs.writeFileSync("giveaways.json", JSON.stringify(obj, null, 2));
}

client.once("ready", () => {
  console.log(`🎉 Logged in as ${client.user.tag}`);
  loadGiveaways();
});

// Slash Command Handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      if (commandName === "giveaway") {
        const sub = options.getSubcommand();

        if (sub === "create") {
          const host = options.getUser("host");
          const prize = options.getString("prize");
          const duration = ms(options.getString("duration"));
          const channel = options.getChannel("channel");

          const endTime = Date.now() + duration;
          const giveawayId = `${Date.now()}_${Math.random().toFixed(5)}`;
          const participants = new Set();

          const embed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway: ${prize}`)
            .setDescription(
              `Hosted by ${host}\nClick below to enter!\nEnds <t:${Math.floor(endTime / 1000)}:R>`
            )
            .setColor("Random");

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`join_${giveawayId}`)
              .setEmoji("🎉")
              .setLabel("Join Giveaway")
              .setStyle(ButtonStyle.Success)
          );

          const msg = await channel.send({ embeds: [embed], components: [row] });

          giveaways.set(giveawayId, {
            messageId: msg.id,
            channelId: channel.id,
            participants,
            prize,
            host: host.id,
            endTime,
          });

          saveGiveaways();

          await interaction.reply({
            content: `✅ Giveaway started in ${channel}`,
            ephemeral: true,
          });

          // Auto-end giveaway
          setTimeout(() => endGiveaway(giveawayId), duration);
        }

        if (sub === "reroll") {
          const id = options.getString("message_id");
          const data = giveaways.get(id);
          if (!data || data.participants.size === 0) {
            return interaction.reply({
              content: "❌ Giveaway not found or no participants joined.",
              ephemeral: true,
            });
          }
          const arr = [...data.participants];
          const winner = arr[Math.floor(Math.random() * arr.length)];
          const channel = await client.channels.fetch(data.channelId);
          channel.send(`🔁 New winner: <@${winner}> for **${data.prize}** 🎉`);
          await interaction.reply({
            content: `🔄 Rerolled! Winner: <@${winner}>`,
            ephemeral: true,
          });
        }

        if (sub === "end") {
          const id = options.getString("message_id");
          const data = giveaways.get(id);
          if (!data) {
            return interaction.reply({
              content: "❌ Giveaway not found.",
              ephemeral: true,
            });
          }
          endGiveaway(id);
          await interaction.reply({
            content: `✅ Giveaway ended manually.`,
            ephemeral: true,
          });
        }
      }
    }

    if (interaction.isButton()) {
      const [action, ...idParts] = interaction.customId.split("_");
      const id = idParts.join("_");

      if (action === "join" && giveaways.has(id)) {
        const data = giveaways.get(id);
        if (data.participants.has(interaction.user.id)) {
          return interaction.reply({
            content: "⚠️ You've already joined this giveaway!",
            ephemeral: true,
          });
        }
        data.participants.add(interaction.user.id);
        saveGiveaways();
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
    console.error("❗ Error:", err);
    if (!interaction.replied) {
      interaction.reply({ content: "⚠️ An error occurred.", ephemeral: true });
    }
  }
});

function endGiveaway(id) {
  const data = giveaways.get(id);
  if (!data) return;

  const channel = client.channels.cache.get(data.channelId);
  if (!channel) return;

  if (data.participants.size === 0) {
    channel.send(`😕 No one joined the giveaway for **${data.prize}**`);
  } else {
    const arr = [...data.participants];
    const winner = arr[Math.floor(Math.random() * arr.length)];
    channel.send(
      `🎉🎉 Congratulations <@${winner}>! You won **${data.prize}** 🎁 hosted by <@${data.host}>`
    );
  }

  giveaways.delete(id);
  saveGiveaways();
}

client.login(process.env.TOKEN);
