require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const autoReplies = require('./replies');

// ===============================
// KEEP-ALIVE WEB SERVER
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 MelloBOT is running 24/7!');
});

app.listen(PORT, () => {
  console.log(`📡 Keep-alive web server listening on port ${PORT}`);
});

// ===============================
// CREATE BOT CLIENT
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===============================
// HELPER FUNCTIONS
// ===============================

// Pick random item from array
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Check if message contains trigger word
function containsTrigger(messageText, triggers) {
  const lowerMessage = messageText.toLowerCase();
  return triggers.some(trigger => lowerMessage.includes(trigger.toLowerCase()));
}

// ===============================
// BOT READY
// ===============================
client.once('ready', () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`📋 Loaded ${autoReplies.length} auto replies`);
  
  // Set bot status
  client.user.setActivity('your messages 👀', { type: 'WATCHING' });
});

// ===============================
// MESSAGE HANDLER
// ===============================
client.on('messageCreate', async (message) => {

  // Ignore bots
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  // ---- SPECIAL COMMANDS ----

  // Roll a dice
  if (content === '!roll') {
    const result = Math.floor(Math.random() * 6) + 1;
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    return message.reply(`🎲 You rolled a **${result}**! ${emojis[result - 1]}`);
  }

  // Flip a coin
  if (content === '!flip') {
    const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
    return message.reply(`The coin landed on **${result}**!`);
  }

  // 8ball
  if (content.startsWith('!8ball')) {
    const question = message.content.slice(7).trim();
    if (!question) return message.reply('❓ Please ask a question! Example: `!8ball Will I win?`');
    
    const answers = [
      '✅ Yes definitely!',
      '✅ Without a doubt!',
      '✅ Most likely yes!',
      '🤔 Maybe... not sure',
      '🤔 Ask again later',
      '🤔 Cannot predict right now',
      '❌ Dont count on it',
      '❌ Very doubtful',
      '❌ My answer is no'
    ];
    
    return message.reply(`🎱 **${getRandom(answers)}**`);
  }

  // Rate something
  if (content.startsWith('!rate')) {
    const thing = message.content.slice(5).trim();
    if (!thing) return message.reply('❓ What should I rate? Example: `!rate pizza`');
    
    const rating = Math.floor(Math.random() * 11);
    const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);
    
    return message.reply(`⭐ I rate **${thing}** a **${rating}/10**\n\`[${bar}]\``);
  }

  // Choose between options
  if (content.startsWith('!choose')) {
    const options = message.content.slice(7).split(',').map(o => o.trim()).filter(o => o);
    if (options.length < 2) return message.reply('❓ Give me options! Example: `!choose pizza, burger, sushi`');
    
    const choice = getRandom(options);
    return message.reply(`🎯 I choose: **${choice}**!`);
  }

  // Hug command
  if (content.startsWith('!hug')) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❓ Mention someone to hug! Example: `!hug @friend`');
    return message.reply(`🤗 **${message.author.username}** gives **${target.username}** a big warm hug!`);
  }

  // Slap command
  if (content.startsWith('!slap')) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❓ Mention someone to slap! Example: `!slap @friend`');
    return message.reply(`👋 **${message.author.username}** slaps **${target.username}** with a big fish!`);
  }

  // Say command
  if (content.startsWith('!say')) {
    const text = message.content.slice(4).trim();
    if (!text) return message.reply('❓ What should I say? Example: `!say Hello everyone!`');
    await message.delete().catch(() => {});
    return message.channel.send(`📢 ${text}`);
  }

  // ---- AUTO REPLIES ----
  for (const reply of autoReplies) {
    if (containsTrigger(content, reply.trigger)) {
      
      // If response is array pick random one
      const response = Array.isArray(reply.response)
        ? getRandom(reply.response)
        : reply.response;

      // Small delay to feel more natural
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return message.reply(response);
    }
  }

});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN);
