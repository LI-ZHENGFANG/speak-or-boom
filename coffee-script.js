/* Speak or Boom — Coffee Shop scenario
 * Fixed dialogue script. 88 rounds across 12 chapters.
 * Each round: { id, chapter, barista (=agent line), user, keywords }
 * keywords: core English words the recognizer listens for (lowercase).
 * Fluency first: keywords are a bonus signal only — never a fail condition.
 * Registered on window.SPEAK_OR_BOOM_SCENARIOS; window.COFFEE_SCRIPT kept as alias.
 */
(function () {
'use strict';
window.SPEAK_OR_BOOM_SCENARIOS = window.SPEAK_OR_BOOM_SCENARIOS || {};
var ROUNDS = [
  // NOTE: field is "barista" in this legacy file; the app treats barista === agent.
  // ---------- Chapter 1: Walking In ----------
  { id: 1, chapter: "Walking In", barista: "Hi! What can I get for you?", user: "Can I get a medium latte, please?", keywords: ["medium", "latte"] },
  { id: 2, chapter: "Walking In", barista: "For here or to go?", user: "For here, please.", keywords: ["here"] },
  { id: 3, chapter: "Walking In", barista: "Hot or iced?", user: "Hot, please.", keywords: ["hot"] },
  { id: 4, chapter: "Walking In", barista: "What size would you like? We have small, medium, and large.", user: "Medium, please.", keywords: ["medium"] },
  { id: 5, chapter: "Walking In", barista: "What kind of milk would you like?", user: "Oat milk, please.", keywords: ["oat", "milk"] },
  { id: 6, chapter: "Walking In", barista: "Would you like an extra shot of espresso?", user: "Yes, please. One extra shot.", keywords: ["extra", "shot"] },
  { id: 7, chapter: "Walking In", barista: "Any sugar or syrup today?", user: "Just one pump of vanilla, please.", keywords: ["vanilla"] },
  { id: 8, chapter: "Walking In", barista: "Can I get a name for the order?", user: "Alex. A-L-E-X.", keywords: ["alex"] },

  // ---------- Chapter 2: Customizing ----------
  { id: 9, chapter: "Customizing", barista: "Would you like whipped cream on top?", user: "No whipped cream, thanks.", keywords: ["whipped", "cream"] },
  { id: 10, chapter: "Customizing", barista: "Do you want it extra hot?", user: "Regular temperature is fine.", keywords: ["regular", "temperature"] },
  { id: 11, chapter: "Customizing", barista: "Would you like to try our new caramel drizzle?", user: "Sure, let's try it.", keywords: ["sure", "try"] },
  { id: 12, chapter: "Customizing", barista: "Anything else for you today?", user: "That's all for now, thanks.", keywords: ["all"] },
  { id: 13, chapter: "Customizing", barista: "Would you like a pastry with your drink?", user: "Yes, a butter croissant, please.", keywords: ["croissant"] },
  { id: 14, chapter: "Customizing", barista: "Should I warm that up for you?", user: "Yes, please warm it up.", keywords: ["warm"] },
  { id: 15, chapter: "Customizing", barista: "Do you have any food allergies I should know about?", user: "No allergies, thanks.", keywords: ["allergies"] },
  { id: 16, chapter: "Customizing", barista: "Great. Anything to drink besides the latte?", user: "No, that's everything.", keywords: ["everything"] },

  // ---------- Chapter 3: Changing the Order ----------
  { id: 17, chapter: "Changing the Order", barista: "So that's one medium oat milk latte with an extra shot and vanilla, plus a croissant?", user: "Actually, make the latte large instead.", keywords: ["large"] },
  { id: 18, chapter: "Changing the Order", barista: "No problem. Large it is. Still oat milk?", user: "Yes, still oat milk.", keywords: ["oat", "milk"] },
  { id: 19, chapter: "Changing the Order", barista: "Do you still want the extra shot?", user: "Actually, cancel the extra shot.", keywords: ["cancel"] },
  { id: 20, chapter: "Changing the Order", barista: "Got it. No extra shot. Anything else to change?", user: "Can I change vanilla to caramel?", keywords: ["caramel"] },
  { id: 21, chapter: "Changing the Order", barista: "Sure, caramel instead of vanilla.", user: "And can I make the croissant an almond croissant?", keywords: ["almond"] },
  { id: 22, chapter: "Changing the Order", barista: "Of course. Almond croissant.", user: "Sorry for all the changes.", keywords: ["sorry", "changes"] },
  { id: 23, chapter: "Changing the Order", barista: "No worries at all! Let me repeat your order.", user: "Please go ahead.", keywords: ["ahead"] },
  { id: 24, chapter: "Changing the Order", barista: "One large oat milk latte with caramel, and one almond croissant. Correct?", user: "That's correct. Thank you.", keywords: ["correct"] },

  // ---------- Chapter 4: Paying ----------
  { id: 25, chapter: "Paying", barista: "Your total is six dollars and fifty cents.", user: "Can I pay with Apple Pay?", keywords: ["apple", "pay"] },
  { id: 26, chapter: "Paying", barista: "Of course. Just tap your phone right here.", user: "Here you go.", keywords: ["here"] },
  { id: 27, chapter: "Paying", barista: "Hmm, it didn't go through. Could you try again?", user: "Sure, let me try again.", keywords: ["try", "again"] },
  { id: 28, chapter: "Paying", barista: "Perfect, payment successful!", user: "Great, thank you.", keywords: ["great"] },
  { id: 29, chapter: "Paying", barista: "Would you like a receipt?", user: "Yes, please. Email receipt is fine.", keywords: ["receipt"] },
  { id: 30, chapter: "Paying", barista: "What's your email address?", user: "It's alex at mail dot com.", keywords: ["mail"] },
  { id: 31, chapter: "Paying", barista: "Do you want to add a tip?", user: "Yes, add a tip of two dollars.", keywords: ["tip", "dollars"] },
  { id: 32, chapter: "Paying", barista: "Thank you so much! Your order number is forty-two.", user: "Forty-two. Got it.", keywords: ["forty", "two"] },

  // ---------- Chapter 5: Waiting ----------
  { id: 33, chapter: "Waiting", barista: "Your drink will be ready in about five minutes.", user: "How long is the wait right now?", keywords: ["long", "wait"] },
  { id: 34, chapter: "Waiting", barista: "Just a few minutes. We're a little backed up.", user: "No rush. Take your time.", keywords: ["rush"] },
  { id: 35, chapter: "Waiting", barista: "You can wait right over there by the counter.", user: "Is there free Wi-Fi here?", keywords: ["wifi"] },
  { id: 36, chapter: "Waiting", barista: "Yes! The password is on your receipt.", user: "What's the Wi-Fi password again?", keywords: ["password"] },
  { id: 37, chapter: "Waiting", barista: "It's 'coffee time', all lowercase, no spaces.", user: "Coffee time, all lowercase. Thanks.", keywords: ["coffee", "time"] },
  { id: 38, chapter: "Waiting", barista: "Are you waiting for someone, or just grabbing a quick coffee?", user: "Just grabbing a quick coffee.", keywords: ["quick", "coffee"] },
  { id: 39, chapter: "Waiting", barista: "Nice. Do you come here often?", user: "Yeah, I come here every morning.", keywords: ["morning"] },
  { id: 40, chapter: "Waiting", barista: "That's great to hear! We love our regulars.", user: "The coffee here is the best.", keywords: ["best"] },

  // ---------- Chapter 6: Finding a Seat ----------
  { id: 41, chapter: "Finding a Seat", barista: "Feel free to grab any open table.", user: "Is this seat taken?", keywords: ["seat", "taken"] },
  { id: 42, chapter: "Finding a Seat", barista: "That one's free. Go ahead.", user: "Is there an outlet near here?", keywords: ["outlet"] },
  { id: 43, chapter: "Finding a Seat", barista: "Yes, there's one right under the window.", user: "Perfect. I need to charge my laptop.", keywords: ["charge", "laptop"] },
  { id: 44, chapter: "Finding a Seat", barista: "The Wi-Fi can be slow during rush hour.", user: "That's okay. I'm just checking email.", keywords: ["email"] },
  { id: 45, chapter: "Finding a Seat", barista: "Let me know if you need anything else.", user: "Can I get some water, please?", keywords: ["water"] },
  { id: 46, chapter: "Finding a Seat", barista: "Still or sparkling?", user: "Still water is fine.", keywords: ["still"] },
  { id: 47, chapter: "Finding a Seat", barista: "Here you go. Anything else?", user: "Could I have some napkins too?", keywords: ["napkins"] },
  { id: 48, chapter: "Finding a Seat", barista: "Sure thing. I'll bring them right over.", user: "Thank you so much.", keywords: ["thank"] },

  // ---------- Chapter 7: Small Talk ----------
  { id: 49, chapter: "Small Talk", barista: "So, what do you do for work?", user: "I'm a software engineer.", keywords: ["software", "engineer"] },
  { id: 50, chapter: "Small Talk", barista: "Oh nice! Do you work from home?", user: "Mostly, yes. I work remotely.", keywords: ["remotely"] },
  { id: 51, chapter: "Small Talk", barista: "That's the dream. What are you working on today?", user: "Just catching up on emails.", keywords: ["emails"] },
  { id: 52, chapter: "Small Talk", barista: "Busy day, huh?", user: "Yeah, meetings all afternoon.", keywords: ["meetings"] },
  { id: 53, chapter: "Small Talk", barista: "Well, at least you have good coffee.", user: "Exactly. Coffee makes everything better.", keywords: ["better"] },
  { id: 54, chapter: "Small Talk", barista: "Where are you from originally?", user: "I'm from Shanghai, originally.", keywords: ["shanghai"] },
  { id: 55, chapter: "Small Talk", barista: "Wow, that's far! How long have you been here?", user: "About three years now.", keywords: ["three", "years"] },
  { id: 56, chapter: "Small Talk", barista: "Do you miss home?", user: "Sometimes, but I like it here.", keywords: ["like", "here"] },

  // ---------- Chapter 8: Drink Made Incorrectly ----------
  { id: 57, chapter: "Drink Made Incorrectly", barista: "Order forty-two! One large latte!", user: "Excuse me, I think this is too sweet.", keywords: ["sweet"] },
  { id: 58, chapter: "Drink Made Incorrectly", barista: "Oh no! Let me check the ticket. Did you want caramel?", user: "Yes, but just half the syrup, please.", keywords: ["half", "syrup"] },
  { id: 59, chapter: "Drink Made Incorrectly", barista: "I'm so sorry. Let me remake it for you.", user: "That's okay. These things happen.", keywords: ["happen"] },
  { id: 60, chapter: "Drink Made Incorrectly", barista: "While we remake it, is the milk okay?", user: "Actually, this tastes like regular milk.", keywords: ["regular", "milk"] },
  { id: 61, chapter: "Drink Made Incorrectly", barista: "You're right, that's my mistake. Oat milk, correct?", user: "Yes, oat milk please.", keywords: ["oat", "milk"] },
  { id: 62, chapter: "Drink Made Incorrectly", barista: "And the size is wrong too. This is a medium.", user: "Right, I ordered a large.", keywords: ["large"] },
  { id: 63, chapter: "Drink Made Incorrectly", barista: "I apologize. We'll get it right this time.", user: "No worries. I appreciate it.", keywords: ["appreciate"] },
  { id: 64, chapter: "Drink Made Incorrectly", barista: "Here's your new drink. Can you taste it first?", user: "This is perfect. Thank you.", keywords: ["perfect"] },

  // ---------- Chapter 9: Ordering Another Drink ----------
  { id: 65, chapter: "Ordering Another Drink", barista: "Can I get you anything else?", user: "Actually, can I order another drink to go?", keywords: ["another", "drink"] },
  { id: 66, chapter: "Ordering Another Drink", barista: "Of course! What would you like?", user: "An iced americano, please.", keywords: ["iced", "americano"] },
  { id: 67, chapter: "Ordering Another Drink", barista: "What size?", user: "Small is fine.", keywords: ["small"] },
  { id: 68, chapter: "Ordering Another Drink", barista: "Any milk or sugar in that?", user: "Black, no sugar. Thanks.", keywords: ["black"] },
  { id: 69, chapter: "Ordering Another Drink", barista: "To go, right?", user: "Yes, to go please.", keywords: ["go"] },
  { id: 70, chapter: "Ordering Another Drink", barista: "That'll be four dollars even.", user: "How much is it altogether?", keywords: ["much"] },
  { id: 71, chapter: "Ordering Another Drink", barista: "Four dollars. You can tap to pay.", user: "Can I use Apple Pay again?", keywords: ["apple", "pay"] },
  { id: 72, chapter: "Ordering Another Drink", barista: "Absolutely. Go ahead and tap.", user: "All done. Thank you.", keywords: ["done"] },

  // ---------- Chapter 10: Talking to Another Customer ----------
  { id: 73, chapter: "Chatting with a Customer", barista: "Hi! Is this seat taken?", user: "No, go ahead. It's free.", keywords: ["free"] },
  { id: 74, chapter: "Chatting with a Customer", barista: "Thanks! I love this coffee shop.", user: "Me too. The vibe is great.", keywords: ["vibe"] },
  { id: 75, chapter: "Chatting with a Customer", barista: "What are you drinking?", user: "An oat milk latte. You should try it.", keywords: ["try"] },
  { id: 76, chapter: "Chatting with a Customer", barista: "That sounds good. Is it sweet?", user: "A little. I get half syrup.", keywords: ["half", "syrup"] },
  { id: 77, chapter: "Chatting with a Customer", barista: "Good tip! I'll try that next time.", user: "Do you come here a lot?", keywords: ["lot"] },
  { id: 78, chapter: "Chatting with a Customer", barista: "Every weekend. It's my ritual.", user: "Nice ritual. I might join you.", keywords: ["ritual"] },
  { id: 79, chapter: "Chatting with a Customer", barista: "Haha, the more the merrier!", user: "Where are you headed after this?", keywords: ["headed"] },
  { id: 80, chapter: "Chatting with a Customer", barista: "Just to the bookstore across the street.", user: "Oh nice. Enjoy your book.", keywords: ["enjoy", "book"] },

  // ---------- Chapter 11: Wrapping Up ----------
  { id: 81, chapter: "Wrapping Up", barista: "Are you all done working for today?", user: "Yes, I'm all done. Just relaxing now.", keywords: ["relaxing"] },
  { id: 82, chapter: "Wrapping Up", barista: "Can I clear your cup?", user: "Yes, please take it. Thanks.", keywords: ["take"] },
  { id: 83, chapter: "Wrapping Up", barista: "Would you like a refill before you go?", user: "No thanks. I'm good.", keywords: ["good"] },
  { id: 84, chapter: "Wrapping Up", barista: "Do you need the restroom before you head out?", user: "Where is the restroom?", keywords: ["restroom"] },

  // ---------- Chapter 12: Leaving ----------
  { id: 85, chapter: "Leaving", barista: "It's down the hall, on the left.", user: "Down the hall, on the left. Got it.", keywords: ["hall", "left"] },
  { id: 86, chapter: "Leaving", barista: "Anything else I can do for you?", user: "No, I think I'm all set.", keywords: ["set"] },
  { id: 87, chapter: "Leaving", barista: "It was great chatting with you today!", user: "You too. See you tomorrow.", keywords: ["tomorrow"] },
  { id: 88, chapter: "Leaving", barista: "Have a wonderful day!", user: "You too. Bye!", keywords: ["bye"] }
];
// The "Chatting with a Customer" chapter is voiced by a fellow customer, not the barista.
ROUNDS.forEach(function (r) {
  if (r.chapter === "Chatting with a Customer") r.speaker = "CUSTOMER";
});
window.SPEAK_OR_BOOM_SCENARIOS.coffee = {
  id: 'coffee',
  title: 'Coffee Shop',
  tagline: 'Order Like a Regular',
  speaker: 'BARISTA',
  difficulty: 'Beginner',
  rounds: ROUNDS
};
window.COFFEE_SCRIPT = ROUNDS; // legacy alias
})();
