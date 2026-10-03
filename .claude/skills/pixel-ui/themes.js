// Fashion in Pixels — dress-up themes.
// A round runs from "Start" to the podium (winners announced). Pick ONE theme when a round starts
// and keep it until the podium; the next round picks a new one.
// Multiplayer: the host/server should pick the theme and broadcast it so every player sees the same one.
//
// Usage (plain <script>):  var t = FIP.pickTheme();  // -> { theme: "Y2K Pop Star", category: "Eras" }
(function (root) {
  var CATEGORIES = {
    "Eras": [
      "Y2K Pop Star", "Disco Fever 1977", "Roaring Twenties Speakeasy", "'90s Grunge Garage Band",
      "'80s Aerobics Class", "Victorian Ghost", "Regency Ballroom", "'60s Mod London", "'50s Diner Date",
      "Medieval Royal Court", "Ancient Greek Goddess", "Wild West Saloon", "2010s Indie Blogger",
      "Renaissance Painting", "Woodstock 1969", "'70s Glam Rock", "Old Hollywood Red Carpet",
      "Flapper at the Jazz Club", "Golden Age Pirate", "The Year 3000"
    ],
    "Aesthetics": [
      "Cottagecore Picnic", "Dark Academia", "Light Academia", "Coquette Bows", "Clean Girl Morning",
      "Mob Wife Winter", "Barbiecore", "Goblincore Forest Finds", "Old Money Yacht Weekend",
      "Indie Sleaze Party", "Balletcore", "Gorpcore Hike", "Blokecore Pub Football", "Coastal Grandmother",
      "Tomato Girl Summer", "Office Siren", "Fairycore", "Cyberpunk Street", "Steampunk Inventor",
      "Harajuku Kawaii"
    ],
    "Movie Moments": [
      "Main Character Energy", "Villain Origin Story", "Rom-Com Meet Cute", "Teen Movie Makeover",
      "Pink on Wednesdays", "Horror Movie Final Girl", "Spy on a Mission", "Superhero Day Off",
      "Rock Star Comeback Tour", "K-pop Comeback Stage", "Reality TV Reunion", "Sitcom Coffee Shop Regular",
      "Film Noir Detective", "Boy Band Album Cover", "Diva World Tour", "First Day at Wizard School",
      "Space Opera Captain", "Zombie Apocalypse Survivor", "Fairy Tale Villain", "Cartoon Character IRL"
    ],
    "Occasions": [
      "First Date", "Job Interview", "Wedding Guest", "Graduation Day", "Music Festival", "Gala Night",
      "Birthday Main Event", "Your Ex's Wedding", "Meeting the Parents", "High School Reunion",
      "New Year's Eve Countdown", "Courtroom Drama", "Bottomless Brunch", "Art Gallery Opening",
      "Tech Startup Pitch", "Sorority Rush", "Bachelorette Weekend", "Tailgate Party", "Prom Night",
      "Fashion Week Front Row"
    ],
    "Places": [
      "Paris Café", "Tokyo Night Market", "Santorini Sunset", "Swiss Ski Chalet", "Miami Pool Party",
      "Safari Expedition", "Mexico City Rooftop", "New York Subway", "Tropical Island Getaway",
      "Las Vegas Wedding Chapel", "Icelandic Glacier", "Amalfi Coast Road Trip", "Rainy Day in London",
      "Seoul Street Snap", "Marrakech Market", "Cozy Alpine Cabin", "Rio Carnival", "Berlin Techno Club",
      "Hawaiian Luau", "Airport Outfit"
    ],
    "Nature": [
      "Under the Sea", "Enchanted Forest", "Thunderstorm", "Volcano Eruption", "Spring Blossom",
      "Autumn Leaves", "Winter Wonderland", "Desert Mirage", "Shooting Star", "Aurora Borealis",
      "Rainbow After Rain", "Midnight Moon", "Sunrise Yoga", "Garden Party in Bloom", "Deep Sea Creature",
      "Fairy Mushroom Ring", "Arctic Explorer", "Butterfly Effect", "Golden Hour", "Black Hole"
    ],
    "Characters": [
      "Mermaid on Land", "Vampire Aristocrat", "Witch's Night Out", "Royal Coronation", "Fortune Teller",
      "Circus Ringmaster", "Mad Scientist", "Ballerina Backstage", "Rock Climber", "Barista Who's Too Cool",
      "Pop-Up Chef", "Astronaut on Shore Leave", "Lifeguard on Duty", "Undercover at the Casino",
      "Cowboy at the Rodeo", "Angel vs. Devil", "Ghost Hunter", "Royal Gardener", "Gamer Streamer",
      "Influencer Unboxing"
    ],
    "Color Challenges": [
      "All Black Everything", "Monochrome Pink", "Head-to-Toe Denim", "Clashing Prints", "Neon Overload",
      "Pastel Dream", "Red Carpet in Red", "Only Earth Tones", "Black and White Film", "Two Colors Only",
      "Mismatched on Purpose", "Leopard Print Only", "Metallic Everything", "Stripes and Polka Dots",
      "Color Block", "Shades of Blue", "Leather and Lace", "Sheer Layers", "Plaid Party",
      "Sparkle Maximalist"
    ],
    "Dress Like...": [
      "Strawberry Shortcake", "Matcha Latte", "Sushi Night", "Bubble Tea Run", "Candy Shop",
      "Pizza Party", "Lemonade Stand", "Taco Tuesday", "Fruit Salad", "Chocolate Factory",
      "Dress Like Your Favorite Dessert", "Dress Like Your Phone Wallpaper", "Dress Like Your Group Chat",
      "Dress Like a Font", "Dress Like a Weather Forecast", "Dress Like Your Zodiac Sign",
      "Dress Like a Houseplant", "Dress Like Your Top Song", "Dress Like a Cocktail",
      "Dress Like a Sunday Morning"
    ],
    "Moods": [
      "Heartbreak Hotel", "Revenge Outfit", "Rich Aunt Energy", "Sleepy but Stylish", "Chaotic Neutral",
      "Unbothered Queen", "Celebrity in Disguise", "Soft Launch", "Hard Launch", "Monday Morning Survival",
      "Delulu Is the Solulu", "Romanticize Your Life", "Gym to Brunch", "Late for Class",
      "Rainy Day Reading", "Cozy Gamer Night", "Sunday Reset", "Spontaneous Road Trip",
      "Overdressed on Purpose", "Dress to Impress Your Crush"
    ]
  };

  var THEMES = [];
  Object.keys(CATEGORIES).forEach(function (category) {
    CATEGORIES[category].forEach(function (theme) { THEMES.push({ theme: theme, category: category }); });
  });

  // Themes used in recent rounds, so a lobby doesn't see repeats for a while.
  var RECENT_LIMIT = 50;
  var recent = [];

  function pickTheme(random) {
    random = random || Math.random;
    var pool = THEMES.filter(function (t) { return recent.indexOf(t.theme) === -1; });
    var pick = pool[Math.floor(random() * pool.length)];
    recent.push(pick.theme);
    if (recent.length > RECENT_LIMIT) recent.shift();
    return pick;
  }

  root.FIP = root.FIP || {};
  root.FIP.THEMES = THEMES;
  root.FIP.THEME_CATEGORIES = CATEGORIES;
  root.FIP.pickTheme = pickTheme;
})(typeof window !== 'undefined' ? window : globalThis);
