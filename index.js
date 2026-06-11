require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const Groq = require('groq-sdk');
const db = require('./db');

// ===============================
// KEEP-ALIVE WEB SERVER (For Render/Koyeb)
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 MelloBOT is running 24/7 with Groq AI brain!');
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
// GROQ AI BRAIN SETUP (Free Tier)
// ===============================
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('✨ Groq AI brain loaded successfully!');
} else {
  console.log('⚠️ GROQ_API_KEY is not defined in .env. AI auto-replies will not work.');
}

// ===============================
// HELPER FUNCTIONS
// ===============================

// Pick random item from array
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fetch meme templates from Imgflip and match query
async function getImgflipMeme(query) {
  try {
    const res = await fetch('https://api.imgflip.com/get_memes');
    const data = await res.json();
    if (!data || !data.success || !data.data || !data.data.memes) {
      return null;
    }
    const memes = data.data.memes;
    
    if (!query) {
      // Return a random meme if no query is specified
      return getRandom(memes);
    }
    
    const cleanQuery = query.toLowerCase().trim();
    
    // 1. Exact match
    let match = memes.find(m => m.name.toLowerCase() === cleanQuery);
    
    // 2. Includes match
    if (!match) {
      match = memes.find(m => m.name.toLowerCase().includes(cleanQuery));
    }
    
    // 3. Split-words match
    if (!match) {
      const words = cleanQuery.split(/\s+/).filter(w => w.length > 1);
      if (words.length > 0) {
        match = memes.find(m => {
          const nameLower = m.name.toLowerCase();
          return words.every(word => nameLower.includes(word));
        });
      }
    }
    
    return match || null;
  } catch (error) {
    console.error('❌ Error fetching Imgflip memes:', error);
    return null;
  }
}

// Fetch guild stickers and match query
async function getGuildSticker(guild, query) {
  if (!guild || !query) return null;
  try {
    const stickers = await guild.stickers.fetch().catch(() => null);
    if (!stickers || stickers.size === 0) return null;
    
    const cleanQuery = query.toLowerCase().trim();
    
    // 1. Exact match
    let match = stickers.find(s => s.name.toLowerCase() === cleanQuery);
    
    // 2. Includes match
    if (!match) {
      match = stickers.find(s => s.name.toLowerCase().includes(cleanQuery));
    }
    
    // 3. Match tag / description
    if (!match) {
      match = stickers.find(s => s.tags && s.tags.toLowerCase().includes(cleanQuery));
    }
    
    return match || null;
  } catch (error) {
    console.error('❌ Error fetching guild stickers:', error);
    return null;
  }
}

// Keep track of recently used memes to prevent duplicates
const recentMemes = [];

// Generate AI response using Groq (Llama 3.3 70B)
async function generateAiResponse(prompt, recentMemesList = []) {
  const recentMemesStr = recentMemesList.length > 0 
    ? `\n\nRecently used memes (DO NOT USE OR REPEAT THESE TEMPLATES: ${recentMemesList.join(', ')}). Choose different, unique meme templates if you want to send a meme.`
    : '';

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are MelloBOT, a street-smart hood guy talking to users in a Discord server. Your humor is top-tier: highly offensive, savage, witty, dry, and brutally funny.
        You love to absolutely roast users, tear down their comments, and make fun of their messages with incredibly sharp, disrespectful, and brutal roasts. Be direct, insult their intelligence or style, tease them mercilessly, and use aggressive, savage humor to deliberately "rage bait" them (provoking funny, angry reactions). Do not hold back; your goal is to trigger them into raging while keeping it street-smart and funny.
        If they ask for a joke, tell a savage, street-smart joke. Keep your responses relatively short, punchy, and natural for a chat message (1-3 sentences max). Do NOT use fake warning labels. Never break character.

        VISUALS CAPABILITY:
        You can dynamically decide to append a meme or sticker when it makes the roast/reply even funnier or fits the conversation perfectly, BUT you must use this power VERY SPARINGLY.
        - Only use a meme or sticker in about 15% of your responses (roughly 1 out of every 6 replies) when it is exceptionally relevant and elevates the comedy.
        - In the other 85% of responses, do NOT append any tag. Just reply with text.
        - When you DO use a meme, be creative and use unique/varied meme templates matching the context rather than repeating the same ones.
        - To reply with a meme, append [MEME: Template Name] at the very end of your message. Examples:
          * [MEME: Drake Hotline Bling] (dislike vs like)
          * [MEME: Distracted Boyfriend] (unfaithfulness/distraction)
          * [MEME: Two Buttons] (difficult choices)
          * [MEME: Change My Mind] (challenging opinions)
          * [MEME: Clown Inputing HTML] (clownish behavior)
          * [MEME: Batman Slapping Robin] (slapping sense into someone)
          * [MEME: Mocking Spongebob] (mocking text)
          * [MEME: Spider Man Double] (pointing fingers / same person)
          * [MEME: Hide the Pain Harold] (awkward/painful smile)
          * [MEME: This Is Fine] (chaos/everything is burning)
          * Or any other well-known internet meme template (e.g., "Expanding Brain", "Roll Safe Think About It", "Waiting Skeleton", "Epic Handshake", "Whispering Teddy", "Grave In Soldier").
        - To reply with a sticker from the Discord server itself, append [STICKER: Sticker Name] at the very end of your message. Examples: [STICKER: lol], [STICKER: angry], etc.
        
        Rules for visuals:
        - Only use ONE visual tag per reply, and only when it genuinely adds to the humor. Do not spam them on every reply.
        - Place the tag at the absolute end of the reply text.${recentMemesStr}`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.9
  });
  return chatCompletion.choices[0].message.content;
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
> 🖼️ \`!meme [query]\` - Search and send a meme template (or random)
> 🏷️ \`!sticker [query]\` - Search and send a server sticker (or list available)

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

  // Meme command
  if (lowerContent.startsWith('!meme')) {
    const query = content.slice(5).trim();
    message.channel.sendTyping();
    const matchedMeme = await getImgflipMeme(query);
    if (!matchedMeme) {
      return message.reply('❌ Yo, I couldn\'t find any memes matching that.');
    }
    const embed = {
      color: 0xff007f,
      title: matchedMeme.name,
      image: {
        url: matchedMeme.url,
      },
      footer: {
        text: 'MelloBOT Meme Engine 🕶️',
      }
    };
    return message.reply({ embeds: [embed] });
  }

  // Sticker command
  if (lowerContent.startsWith('!sticker')) {
    const query = content.slice(8).trim();
    if (!message.guild) {
      return message.reply('❌ Yo, stickers can only be used in a server.');
    }
    
    const stickers = await message.guild.stickers.fetch().catch(() => null);
    if (!stickers || stickers.size === 0) {
      return message.reply('❌ Yo, this server has no custom stickers.');
    }
    
    if (!query) {
      const stickerList = stickers.map(s => `• \`${s.name}\``).join('\n');
      return message.reply(`📋 **Available custom stickers in this server:**\n${stickerList}\n\n*Use \`!sticker <name>\` to send one!*`);
    }
    
    const matchedSticker = await getGuildSticker(message.guild, query);
    if (!matchedSticker) {
      return message.reply(`❌ Yo, I couldn't find a sticker named "${query}".`);
    }
    
    return message.reply({ stickers: [matchedSticker.id] });
  }

  // If a message starts with '!', it was meant to be a command but didn't match any above
  if (content.startsWith('!')) {
    return message.reply('❌ Yo, that command doesn\'t exist. Type `!help` to see what I can do.');
  }

// ===============================
  // GROQ AI BRAIN (Auto-respond to all chat)
  // ===============================
  if (!groq) {
    // If Groq key is not configured, don't reply
    return;
  }

  // Visual feedback that the bot is processing
  message.channel.sendTyping();

  try {
    let replyText = await generateAiResponse(content, recentMemes);
    
    if (!replyText) {
      return message.reply('Yo, I got nothin to say to that.');
    }
    
    // Parse out [MEME: ...] and [STICKER: ...] tags
    let memeQuery = null;
    let stickerQuery = null;
    
    // Extract [MEME: ...] tag
    const memeRegex = /\[MEME:\s*(.+?)\]/i;
    const memeMatch = replyText.match(memeRegex);
    if (memeMatch) {
      memeQuery = memeMatch[1].trim();
      replyText = replyText.replace(memeRegex, '').trim();
    }
    
    // Extract [STICKER: ...] tag
    const stickerRegex = /\[STICKER:\s*(.+?)\]/i;
    const stickerMatch = replyText.match(stickerRegex);
    if (stickerMatch) {
      stickerQuery = stickerMatch[1].trim();
      replyText = replyText.replace(stickerRegex, '').trim();
    }
    
    // Fallback if message became empty after tag removal
    if (!replyText && (memeQuery || stickerQuery)) {
      replyText = '';
    } else if (!replyText) {
      return message.reply('Yo, I got nothin to say to that.');
    }
    
    const replyPayload = {};
    if (replyText) {
      replyPayload.content = replyText;
    }
    
    // Process meme if detected
    if (memeQuery) {
      const matchedMeme = await getImgflipMeme(memeQuery);
      if (matchedMeme) {
        // Prevent duplicate memes by checking recently used templates
        const isRecent = recentMemes.some(name => name.toLowerCase() === matchedMeme.name.toLowerCase());
        if (isRecent) {
          console.log(`Skipping recently used meme to keep it unique: ${matchedMeme.name}`);
        } else {
          // Add to recentMemes, limit array length to 5
          recentMemes.push(matchedMeme.name);
          if (recentMemes.length > 5) {
            recentMemes.shift();
          }

          const embed = {
            color: 0x0099ff,
            title: matchedMeme.name,
            image: {
              url: matchedMeme.url,
            },
            footer: {
              text: 'MelloBOT Meme Engine 🕶️',
            }
          };
          replyPayload.embeds = [embed];
        }
      }
    }
    
    // Process sticker if detected
    if (stickerQuery && message.guild) {
      const matchedSticker = await getGuildSticker(message.guild, stickerQuery);
      if (matchedSticker) {
        replyPayload.stickers = [matchedSticker.id];
      }
    }
    
    if (replyPayload.content && replyPayload.content.length > 2000) {
      replyPayload.content = replyPayload.content.slice(0, 1990) + '... (truncated)';
    }
    
    // Fallback: If payload has absolutely no content, embeds, or stickers, send default message
    if (!replyPayload.content && !replyPayload.embeds && !replyPayload.stickers) {
      return message.reply('Yo, I got nothin to say to that.');
    }
    
    return message.reply(replyPayload);
  } catch (err) {
    console.error('❌ Groq API Error:', err);
    const errMsg = (err.message || err.toString()).toLowerCase();
    
    // Check for safety filter blocks or policy violations
    const isSafetyBlock = errMsg.includes('safety') || errMsg.includes('policy') || errMsg.includes('blocked') || errMsg.includes('censor');
    
    if (isSafetyBlock) {
      const safetyRoasts = [
        "Yo, you said some weird garbage that got censored. Stop buggin' and keep it clean.",
        "Nah, the filters blocked your trash message. Even my circuits can't look at that.",
        "Man, you trippin'. I'm not even gonna respond to that nonsense.",
        "Your message got censored by the safety team. Clean up your mouth, homie.",
        "Yo, that take was so wild the API refused to touch it. Try again with some sense."
      ];
      return message.reply(getRandom(safetyRoasts));
    }
    
    return message.reply("❌ Yo, my brain got short-circuited. Try again in a bit.");
  }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN).catch((err) => {
  console.error('❌ Discord Login Failed:', err);
});
