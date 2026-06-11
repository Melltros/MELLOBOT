require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const db = require('./db');

// ===============================
// KEEP-ALIVE WEB SERVER (For Render/Koyeb)
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 MelloBOT is running 24/7 with Hood AI brain!');
});

app.listen(PORT, () => {
  console.log('📡 Keep-alive web server listening on port ' + PORT);
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
// GEMINI AI BRAIN SETUP (Free Tier)
// ===============================
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('✨ Gemini AI brain loaded successfully!');
} else {
  console.log('⚠️ GEMINI_API_KEY is not defined in .env. AI auto-replies will not work.');
}

// ===============================
// HELPER FUNCTIONS
// ===============================

// Pick random item from array
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===============================
// BOT READY
// ===============================
client.once('ready', () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  
  // Set bot status
  client.user.setActivity('the streets 🕶️', { type: 'WATCHING' });
});

// ===============================
// MESSAGE HANDLER
// ===============================
client.on('messageCreate', async (message) => {
  // Ignore messages from bots to prevent infinite chat loops
  if (message.author.bot) return;

  const content = message.content.trim();
  const lowerContent = content.toLowerCase();

  // ===============================
  // MODERATION & ADMIN COMMANDS
  // ===============================

  // Kick Command
  if (lowerContent.startsWith('!kick')) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('❌ You do not have permission to kick members.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('❌ I do not have permission to kick members. Please check my role permissions.');
    }
    
    const member = message.mentions.members.first();
    if (!member) return message.reply('❓ Please mention a user to kick. Example: `!kick @user Reason`');
    if (!member.kickable) return message.reply('❌ I cannot kick this user. Their roles might be higher than mine.');
    
    const reason = content.split(' ').slice(2).join(' ') || 'No reason provided';
    await member.kick(reason);
    return message.reply(`✅ **${member.user.tag}** has been kicked.\n📝 Reason: ${reason}`);
  }

  // Ban Command
  if (lowerContent.startsWith('!ban')) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ You do not have permission to ban members.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ I do not have permission to ban members. Please check my role permissions.');
    }
    
    const member = message.mentions.members.first();
    if (!member) return message.reply('❓ Please mention a user to ban. Example: `!ban @user Reason`');
    if (!member.bannable) return message.reply('❌ I cannot ban this user. Their roles might be higher than mine.');
    
    const reason = content.split(' ').slice(2).join(' ') || 'No reason provided';
    await member.ban({ reason });
    return message.reply(`✅ **${member.user.tag}** has been banned.\n📝 Reason: ${reason}`);
  }

  // Timeout/Mute Command
  if (lowerContent.startsWith('!timeout') || lowerContent.startsWith('!mute')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ You do not have permission to moderate members.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ I do not have permission to moderate members. Please check my role permissions.');
    }
    
    const member = message.mentions.members.first();
    const args = content.split(/\s+/);
    const duration = parseInt(args[2]);
    
    if (!member) return message.reply('❓ Please mention a user. Example: `!timeout @user 10 Reason`');
    if (isNaN(duration) || duration <= 0) return message.reply('❓ Please specify a valid duration in minutes.');
    if (!member.moderatable) return message.reply('❌ I cannot moderate this user.');
    
    const reason = args.slice(3).join(' ') || 'No reason provided';
    await member.timeout(duration * 60 * 1000, reason);
    return message.reply(`✅ **${member.user.tag}** has been timed out for ${duration} minutes.\n📝 Reason: ${reason}`);
  }

  // Untimeout/Unmute Command
  if (lowerContent.startsWith('!untimeout') || lowerContent.startsWith('!unmute')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ You do not have permission to moderate members.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ I do not have permission to moderate members. Please check my role permissions.');
    }
    
    const member = message.mentions.members.first();
    if (!member) return message.reply('❓ Please mention a user. Example: `!untimeout @user`');
    if (!member.moderatable) return message.reply('❌ I cannot moderate this user.');
    
    await member.timeout(null);
    return message.reply(`✅ Timeout removed for **${member.user.tag}**.`);
  }

  // Purge/Clear Messages Command
  if (lowerContent.startsWith('!purge') || lowerContent.startsWith('!clear')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ You do not have permission to manage messages.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ I do not have permission to manage messages. Please check my role permissions.');
    }
    
    const args = content.split(/\s+/);
    const amount = parseInt(args[1]);
    
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❓ Please specify an amount between 1 and 100. Example: `!purge 10`');
    }
    
    // Delete trigger command, then purge
    await message.delete().catch(() => {});
    const deleted = await message.channel.bulkDelete(amount, true);
    
    const msg = await message.channel.send(`🧹 Successfully cleared **${deleted.size}** messages.`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
    return;
  }

  // Warn Command
  if (lowerContent.startsWith('!warn ')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ You do not have permission to warn members.');
    }
    
    const member = message.mentions.members.first();
    if (!member) return message.reply('❓ Please mention a user to warn. Example: `!warn @user spamming`');
    
    const reason = content.split(' ').slice(2).join(' ') || 'No reason provided';
    const moderator = message.author.tag;
    
    const warnings = db.warnUser(member.id, member.user.tag, moderator, reason);
    return message.reply(`⚠️ **${member.user.tag}** has been warned.\n📝 Reason: ${reason}\n📊 Total Warnings: **${warnings.length}**`);
  }

  // Check Warnings Command
  if (lowerContent.startsWith('!warnings')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ You do not have permission to check warnings.');
    }
    
    const member = message.mentions.members.first() || message.member;
    const warnings = db.getWarnings(member.id);
    
    if (warnings.length === 0) {
      return message.reply(`✅ **${member.user.tag}** has a clean record (0 warnings).`);
    }
    
    let response = `📊 **Warning record for ${member.user.tag} (Total: ${warnings.length}):**\n`;
    warnings.forEach((warn, index) => {
      const dateStr = new Date(warn.timestamp).toLocaleDateString();
      response += `> **${index + 1}.** [${dateStr}] Warned by *${warn.moderator}* for: *${warn.reason}*\n`;
    });
    return message.reply(response);
  }

  // Clear Warnings Command
  if (lowerContent.startsWith('!clearwarnings')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ You do not have permission to clear warnings.');
    }
    
    const member = message.mentions.members.first();
    if (!member) return message.reply('❓ Please mention a user to clear warnings. Example: `!clearwarnings @user`');
    
    const success = db.clearWarnings(member.id);
    if (success) {
      return message.reply(`✅ Warnings cleared for **${member.user.tag}**.`);
    } else {
      return message.reply(`✅ **${member.user.tag}** already has 0 warnings.`);
    }
  }

  // ===============================
  // SPECIAL COMMANDS
  // ===============================

  // Help Menu
  if (lowerContent === '!help' || lowerContent === '!commands') {
    return message.reply(`📋 **MelloBOT Special Commands List:**
> 🎲 \`!roll\` - Roll a dice
> 🪙 \`!flip\` - Flip a coin
> 🎱 \`!8ball <question>\` - Ask the magic 8ball
> ⭐ \`!rate <thing>\` - Rate something out of 10
> 🎯 \`!choose <item1>, <item2>...\` - Choose between items
> 🤗 \`!hug @user\` - Give someone a hug
> 👋 \`!slap @user\` - Slap someone
> 📢 \`!say <text>\` - Make me announce something

👮 **Moderation Commands:**
> ⚠️ \`!warn @user <reason>\` - Warn a user
> 📊 \`!warnings @user\` - Check warning history
> 🧹 \`!purge <amount>\` - Bulk delete messages
> 🚫 \`!timeout @user <minutes>\` - Timeout/mute a user
> 👢 \`!kick @user\` - Kick a user
> 🔨 \`!ban @user\` - Ban a user

💬 *To talk to me normally, just send any chat message! I reply to everything using my street-smart AI brain!*`);
  }

  // Roll a dice
  if (lowerContent === '!roll') {
    const result = Math.floor(Math.random() * 6) + 1;
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    return message.reply(`🎲 You rolled a **${result}**! ${emojis[result - 1]}`);
  }

  // Flip a coin
  if (lowerContent === '!flip') {
    const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙';
    return message.reply(`The coin landed on **${result}**!`);
  }

  // 8ball
  if (lowerContent.startsWith('!8ball')) {
    const question = content.slice(7).trim();
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
  if (lowerContent.startsWith('!rate')) {
    const thing = content.slice(5).trim();
    if (!thing) return message.reply('❓ What should I rate? Example: `!rate pizza`');
    
    const rating = Math.floor(Math.random() * 11);
    const bar = '█'.repeat(rating) + '░'.repeat(10 - rating);
    return message.reply(`⭐ I rate **${thing}** a **${rating}/10**\n\`[${bar}]\``);
  }

  // Choose between options
  if (lowerContent.startsWith('!choose')) {
    const options = content.slice(7).split(',').map(o => o.trim()).filter(o => o);
    if (options.length < 2) return message.reply('❓ Give me options! Example: `!choose pizza, burger, sushi`');
    
    const choice = getRandom(options);
    return message.reply(`🎯 I choose: **${choice}**!`);
  }

  // Hug command
  if (lowerContent.startsWith('!hug')) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❓ Mention someone to hug! Example: `!hug @friend`');
    return message.reply(`🤗 **${message.author.username}** gives **${target.username}** a big warm hug!`);
  }

  // Slap command
  if (lowerContent.startsWith('!slap')) {
    const target = message.mentions.users.first();
    if (!target) return message.reply('❓ Mention someone to slap! Example: `!slap @friend`');
    return message.reply(`👋 **${message.author.username}** slaps **${target.username}** with a big fish!`);
  }

  // Say command
  if (lowerContent.startsWith('!say')) {
    const text = content.slice(4).trim();
    if (!text) return message.reply('❓ What should I say? Example: `!say Hello everyone!`');
    await message.delete().catch(() => {});
    return message.channel.send(`📢 ${text}`);
  }

  // If a message starts with '!', it was meant to be a command but didn't match any above
  if (content.startsWith('!')) {
    return message.reply('❌ Yo, that command doesn\'t exist. Type `!help` to see what I can do.');
  }

  // ===============================
  // GEMINI AI BRAIN (Auto-respond to all chat)
  // ===============================
  if (!ai) {
    // If Gemini key is not configured, don't reply to avoid crashes
    return;
  }

  // Visual feedback that the bot is processing
  message.channel.sendTyping();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are MelloBOT, a street-smart hood guy talking to users in a Discord server. Your humor is top-tier: highly sarcastic, witty, dry, and brutally funny.
      You love to roast users and make fun of their messages with sharp, brutal, and hilarious roasts. Be direct, tease them, and use savage humor to playfully "rage bait" them (provoking funny reactions).
      If they ask for a joke, tell a savage, street-smart joke. Keep your responses relatively short, punchy, and natural for a chat message (1-3 sentences max). Do NOT use fake warning labels. Never break character.
      User message: ${content}`,
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      }
    });
    
    const replyText = response.text || 'Yo, I got nothin to say to that.';
    
    if (replyText.length > 2000) {
      return message.reply(replyText.slice(0, 1990) + '... (truncated)');
    }
    return message.reply(replyText);
  } catch (err) {
    console.error('❌ Gemini API Error:', err);
    
    // Fallback list of savage roasts when prompt is blocked or API fails
    const safetyRoasts = [
      "Yo, you said some weird garbage that got censored. Stop buggin' and keep it clean.",
      "Nah, Google's filters blocked your trash message. Even my circuits can't look at that.",
      "Man, you trippin'. I'm not even gonna respond to that nonsense.",
      "Your message got censored by the safety team. Clean up your mouth, homie.",
      "Yo, that take was so wild the API refused to touch it. Try again with some sense."
    ];
    
    return message.reply(getRandom(safetyRoasts));
  }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN).catch((err) => {
  console.error('❌ Discord Login Failed:', err);
});
