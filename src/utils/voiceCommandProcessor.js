function normalize(command = '') {
  return command.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesAny(text, keywords) {
  return keywords.find((keyword) => text.includes(keyword));
}

function result(intent, response, keyword, extra = {}) {
  console.log('MATCHED INTENT:', intent);
  console.log('MATCH KEYWORD:', keyword);
  return { intent, response, ...extra };
}

export function processVoiceCommand(command) {
  const normalizedCommand = normalize(command);
  console.log('PROCESSING COMMAND:', normalizedCommand);

  const stopKeyword = includesAny(normalizedCommand, ['stop talking', 'be quiet', 'stop']);
  if (stopKeyword) return result('STOP', '', stopKeyword);

  const objectKeywords = [
    ['walking stick', 'walking stick'], ['glasses', 'glasses'], ['spectacles', 'glasses'],
    ['medicine', 'medicine'], ['phone', 'phone'], ['mobile', 'phone'], ['keys', 'keys'], ['key', 'keys'],
  ];
  const objectMatch = objectKeywords.find(([keyword]) => normalizedCommand.includes(keyword));
  if (objectMatch) return result('FIND_OBJECT', `I'll help you find your ${objectMatch[1]}.`, objectMatch[0], { object: objectMatch[1], destination: 'object-finder' });

  const familyKeywords = [['daughter', 'Anita'], ['anita', 'Anita'], ['son', 'Rahul'], ['rahul', 'Rahul'], ['wife', 'Sita'], ['sita', 'Sita']];
  const familyMatch = familyKeywords.find(([keyword]) => normalizedCommand.includes(keyword));
  if (familyMatch) return result('SHOW_PERSON', `This is ${familyMatch[1]}.`, familyMatch[0], { person: familyMatch[1], destination: 'my-people' });
  const familyKeyword = includesAny(normalizedCommand, ['family', 'people', 'loved ones']);
  if (familyKeyword) return result('NAVIGATE', "Let's see your loved ones.", familyKeyword, { screen: 'my-people', destination: 'my-people' });

  const musicKeyword = includesAny(normalizedCommand, ['music', 'song', 'songs']);
  if (musicKeyword) {
    console.log('PROCESSING MUSIC COMMAND:', normalizedCommand);
    return result('COMFORT_MUSIC', "Let's listen to something comforting.", musicKeyword, { section: 'music', destination: 'comfort-zone' });
  }

  const gameKeywords = ['memory match', 'who is who', 'family game', 'pattern recognition', 'pattern game', 'object recognition', 'object game'];
  const gameKeyword = includesAny(normalizedCommand, gameKeywords);
  if (gameKeyword) {
    const game = gameKeyword.includes('match') ? 'match' : gameKeyword.includes('who') || gameKeyword.includes('family') ? 'who' : gameKeyword.includes('pattern') ? 'pattern' : 'object';
    return result('START_GAME', "Let's exercise your mind together.", gameKeyword, { game, destination: 'memory-games' });
  }
  const generalGameKeyword = includesAny(normalizedCommand, ['game', 'games', 'play', 'memory activity', 'exercise my mind']);
  if (generalGameKeyword) return result('NAVIGATE', "Let's exercise your mind together.", generalGameKeyword, { screen: 'memory-games', destination: 'memory-games' });

  const moodKeywords = [['happy', 'happy'], ['good', 'happy'], ['okay', 'okay'], ['alright', 'okay'], ['sad', 'sad'], ['lonely', 'sad'], ['worried', 'worried'], ['scared', 'worried'], ['upset', 'worried']];
  const moodMatch = moodKeywords.find(([keyword]) => normalizedCommand.includes(keyword));
  if (moodMatch) {
    const responses = { happy: "I'm happy you're feeling good today.", okay: "That's okay. I'm here with you.", sad: "I'm here with you. You are not alone.", worried: "Don't worry. I'm here with you." };
    return result('MOOD', responses[moodMatch[1]], moodMatch[0], { mood: moodMatch[1], destination: 'mood-check' });
  }

  const whatShouldIDoNow = /what should i do( now| next)?$|what do i do( now| next)?$|what do i need to do( now| next)?$|what should i do$|what do i have to do now$|what is next$|whats next$|tell me what i should do( next)?$|tell me what to do next$/.test(normalizedCommand);
  if (whatShouldIDoNow) return result('WHAT_SHOULD_I_DO_NOW', '', 'what should i do', { destination: 'my-day' });

  const comfortKeyword = includesAny(normalizedCommand, ['relax', 'peace', 'peaceful', 'calm', 'comfort', 'comfortable', 'rest']);
  if (comfortKeyword) return result('COMFORT_ZONE', "Let's spend a peaceful moment together.", comfortKeyword, { section: 'relax', destination: 'comfort-zone' });
  if (normalizedCommand.includes('music')) return result('COMFORT_MUSIC', "Let's listen to something comforting.", 'music', { section: 'music', destination: 'comfort-zone' });

  const dayKeyword = includesAny(normalizedCommand, ['schedule', 'routine', 'today', 'next', 'plan']);
  if (dayKeyword) return result('NAVIGATE', "Let's look at your day together.", dayKeyword, { screen: 'my-day', destination: 'my-day' });
  if (normalizedCommand.includes('home')) return result('NAVIGATE', 'Taking you home.', 'home', { screen: 'home', destination: 'home' });
  if (normalizedCommand.includes('back') || normalizedCommand.includes('previous page')) return result('BACK', '', normalizedCommand.includes('back') ? 'back' : 'previous page');
  if (normalizedCommand === 'help' || normalizedCommand.includes('what can i say') || normalizedCommand.includes('what can you do')) return result('HELP', 'You can ask me about your day, your family, play games, find your things, check how you feel, or help you relax.', 'help');

  console.log('MATCHED INTENT:', 'UNKNOWN');
  return { intent: 'UNKNOWN', response: "I'm sorry, I didn't understand that. You can ask me about your day, your family, play a game, find something, or help you relax." };
}

export { normalize };