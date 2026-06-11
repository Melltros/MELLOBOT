const autoReplies = [

  // ---- GREETINGS ----
  {
    trigger: ['hello', 'hi', 'hey', 'sup', 'wassup'],
    response: '👋 Hey there! How are you doing?'
  },
  {
    trigger: ['good morning', 'gm'],
    response: '🌅 Good morning! Hope you have an amazing day!'
  },
  {
    trigger: ['good night', 'gn'],
    response: '🌙 Good night! Sweet dreams!'
  },
  {
    trigger: ['good evening'],
    response: '🌆 Good evening! How was your day?'
  },

  // ---- HOW ARE YOU ----
  {
    trigger: ['how are you', 'how r u', 'hows it going', 'how are u'],
    response: '😊 Im doing great thanks for asking! How about you?'
  },

  // ---- BOT INFO ----
  {
    trigger: ['what are you', 'are you a bot', 'are you human', 'who are you'],
    response: '🤖 I am an auto reply bot! I respond to messages automatically!'
  },

  // ---- HELP ----
  {
    trigger: ['help', 'commands', 'what can you do'],
    response: `📋 **Here's what I respond to:**
> 👋 Greetings - hi, hello, hey
> 🌅 Good morning / Good night
> ❓ Questions about me
> 😂 Jokes
> 🎲 Fun stuff like \`!roll\` or \`!flip\`
> And much more!`
  },

  // ---- JOKES ----
  {
    trigger: ['tell me a joke', 'say a joke', 'joke'],
    response: [
      '😂 Why dont scientists trust atoms? Because they make up everything!',
      '😂 Why did the scarecrow win an award? Because he was outstanding in his field!',
      '😂 I told my wife she was drawing her eyebrows too high. She looked surprised!',
      '😂 Why dont eggs tell jokes? They would crack each other up!',
      '😂 What do you call a fake noodle? An impasta!'
    ]
  },

  // ---- COMPLIMENTS ----
  {
    trigger: ['youre cool', 'your cool', 'you are cool', 'i like you'],
    response: [
      '😎 Thanks you are pretty cool yourself!',
      '🥰 Aww that means a lot thank you!',
      '✨ You are too kind!'
    ]
  },

  // ---- SAD/MOOD ----
  {
    trigger: ['im sad', 'i am sad', 'feeling sad', 'im depressed', 'i feel bad'],
    response: '💙 Aww I am sorry to hear that. Remember things will get better! You are not alone 💪'
  },
  {
    trigger: ['im happy', 'i am happy', 'feeling great', 'im excited'],
    response: '🎉 That is awesome! Love to hear it! Keep that energy going!'
  },
  {
    trigger: ['im bored', 'i am bored', 'so bored'],
    response: [
      '😴 Bored? Try typing `!roll` or `!flip` for some fun!',
      '🎮 When bored just start chaos in the server lol',
      '🎲 Try asking me a joke! Type: tell me a joke'
    ]
  },

  // ---- FUN ----
  {
    trigger: ['i love you', 'ily'],
    response: [
      '🥺 Aww I love you too bestie!',
      '❤️ Awww you are so sweet!',
      '💕 Aww that made my circuits happy!'
    ]
  },
  {
    trigger: ['gg', 'good game'],
    response: '🎮 GG! Well played!'
  },
  {
    trigger: ['f'],
    response: '**F** 🫡 We pay our respects'
  },
  {
    trigger: ['lol', 'lmao', 'lmfao', 'haha', 'hehe'],
    response: [
      '😂 hahaha!',
      '💀 lmaooo',
      '😭 dead 💀'
    ]
  },

  // ---- FOOD ----
  {
    trigger: ['im hungry', 'i am hungry', 'i want food'],
    response: [
      '🍕 Same... I could go for some pizza right now',
      '🍔 Go grab a snack! You deserve it',
      '🍜 Have you eaten today? Go get some food!'
    ]
  },

  // ---- THANKS ----
  {
    trigger: ['thank you', 'thanks', 'ty', 'thx'],
    response: [
      '😊 No problem at all!',
      '✨ Anytime!',
      '🙌 Happy to help!'
    ]
  },

  // ---- BYE ----
  {
    trigger: ['bye', 'goodbye', 'cya', 'see ya', 'later'],
    response: [
      '👋 See you later!',
      '👋 Byeee! Come back soon!',
      '✌️ Later! Take care!'
    ]
  }

];

module.exports = autoReplies;
