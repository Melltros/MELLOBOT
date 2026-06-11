require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const autoReplies = require('./replies');
const db = require('./db');

// ===============================
// KEEP-ALIVE WEB SERVER (For Render/Koyeb)
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 MelloBOT is running 24/7 with premium upgrades!');
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
// GEMINI AI BRAIN SETUP (Free Tier)
// ===============================
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('✨ Gemini AI brain loaded successfully!');
} else {
  console.log('⚠️ GEMINI_API_KEY is not defined in .env. AI commands and mentions will not be available.');
}

// ===============================
// HELPER FUNCTIONS
// ===============================

// Pick random item from array
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if message contains trigger word (with smart boundary checks)
function containsTrigger(messageText, triggers) {
  const lowerMessage = messageText.toLowerCase();
  return triggers.some(trigger => {
    const triggerLower = trigger.toLowerCase();
    
    // Boundary-aware matching (so 'f' won't match inside 'for', 'hi' won't match inside 'this')
    const startBoundary = /^\w/.test(triggerLower) ? '\\b' : '';
    const endBoundary = /\w$/.test(triggerLower) ? '\\b' : '';
    const regex = new RegExp(`${startBoundary}${escapeRegExp(triggerLower)}${endBoundary}`, 'i');
    return regex.test(lowerMessage);
  });
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
  // Ignore messages from bots
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

  // ===============================
  // GEMINI AI BRAIN (Mention/Command Fallback)
  // ===============================
  const botMention = `<@${client.user.id}>`;
  const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;
  const isAiCommand = lowerContent.startsWith('!ai ');
  
  if (isMentioned || isAiCommand) {
    if (!ai) {
      return message.reply('🤖 Sorry, my AI brain (Gemini API) is not configured by the server administrator.');
    }
    
    let prompt = '';
    if (isAiCommand) {
      prompt = content.slice(4).trim();
    } else {
      prompt = content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
    }
    
    if (!prompt) {
      return message.reply('🤖 I am listening! Ask me anything: `@MelloBOT <question>` or `!ai <question>`');
    }
    
    message.channel.sendTyping();
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are MelloBOT, a friendly, intelligent, and helpful Discord bot. Answer user queries helpfully and naturally. Keep answers relatively concise for Discord chat.
User query: ${prompt}`
      });
      
      const replyText = response.text || '🤖 Sorry, I generated an empty response.';
      
      if (replyText.length > 2000) {
        return message.reply(replyText.slice(0, 1990) + '... (truncated)');
      }
      return message.reply(replyText);
    } catch (err) {
      console.error('❌ Gemini API Error:', err);
      return message.reply('❌ Oops, my AI brain encountered an error processing your query. Please try again later.');
    }
  }

  // ===============================
  // AUTO REPLIES (Smart Word Boundary Check)
  // ===============================
  for (const reply of autoReplies) {
    if (containsTrigger(lowerContent, reply.trigger)) {
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
client.login(process.env.TOKEN).catch((err) => {
  console.error('❌ Discord Login Failed:', err);
});
