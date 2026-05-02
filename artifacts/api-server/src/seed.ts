import { db, placesTable, eventsTable, dealsTable, itinerariesTable, itineraryStopsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Seed places (50 places across categories in NYC/San Francisco as demo)
  const places = await db.insert(placesTable).values([
    // Food & Cafes - NYC
    { name: "The Halal Guys", category: "food", description: "Famous street food cart serving halal rice and gyro platters.", address: "W 53rd St & 6th Ave", city: "New York", lat: 40.7614, lng: -73.9776, rating: 4.5, reviewCount: 12400, phone: "+1-212-555-0101", openingHours: "Daily 10am-4am", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800", images: ["https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800"], tags: ["street food", "halal", "cheap", "iconic"] },
    { name: "Balthazar", category: "food", description: "Classic French brasserie with amazing brunch and oysters.", address: "80 Spring St, SoHo", city: "New York", lat: 40.7228, lng: -73.9979, rating: 4.4, reviewCount: 8900, phone: "+1-212-965-1414", openingHours: "Daily 7:30am-12am", imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800", images: ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"], tags: ["brunch", "french", "upscale", "oysters"] },
    { name: "Levain Bakery", category: "food", description: "World-famous bakery known for enormous, gooey cookies.", address: "167 W 74th St, Upper West Side", city: "New York", lat: 40.7788, lng: -73.9813, rating: 4.7, reviewCount: 15200, openingHours: "Mon-Sat 8am-7pm, Sun 9am-7pm", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800", images: ["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800"], tags: ["bakery", "cookies", "dessert", "famous"] },
    { name: "Katz's Delicatessen", category: "food", description: "Legendary NYC deli since 1888. The pastrami sandwich is a must.", address: "205 E Houston St, Lower East Side", city: "New York", lat: 40.7223, lng: -73.9874, rating: 4.4, reviewCount: 21000, phone: "+1-212-254-2246", openingHours: "Mon-Wed 8am-10:45pm, Thu-Sun 8am-12am", imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800", images: ["https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800"], tags: ["deli", "pastrami", "historic", "sandwiches"] },
    { name: "Cafe Mogador", category: "food", description: "Moroccan cafe with excellent shakshuka and tagines in East Village.", address: "101 St Marks Pl, East Village", city: "New York", lat: 40.7268, lng: -73.9849, rating: 4.3, reviewCount: 4500, openingHours: "Daily 9am-12am", imageUrl: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800", images: ["https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800"], tags: ["moroccan", "brunch", "cafe", "shakshuka"] },
    { name: "Joe's Pizza", category: "food", description: "The quintessential NYC slice. Simple, perfect, no frills.", address: "7 Carmine St, Greenwich Village", city: "New York", lat: 40.7301, lng: -74.0023, rating: 4.5, reviewCount: 18000, openingHours: "Daily 10am-4am", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800", images: ["https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800"], tags: ["pizza", "iconic", "cheap", "quick"] },
    { name: "Russ & Daughters", category: "food", description: "Historic appetizing store with exceptional smoked salmon and caviar.", address: "179 E Houston St", city: "New York", lat: 40.7224, lng: -73.9868, rating: 4.6, reviewCount: 6700, openingHours: "Mon-Fri 8am-6pm, Sat-Sun 8am-7pm", imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800", images: ["https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800"], tags: ["deli", "smoked fish", "jewish", "historic"] },
    { name: "Xi'an Famous Foods", category: "food", description: "Bold, spicy hand-pulled noodles and lamb burgers from Xi'an, China.", address: "81 St Marks Pl, East Village", city: "New York", lat: 40.7271, lng: -73.9849, rating: 4.4, reviewCount: 9800, openingHours: "Daily 11am-10pm", imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800", images: ["https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800"], tags: ["chinese", "noodles", "spicy", "cheap"] },

    // Attractions - NYC
    { name: "Central Park", category: "attraction", description: "840-acre urban park at the heart of Manhattan. Perfect for cycling, picnics, and people-watching.", address: "Central Park, Manhattan", city: "New York", lat: 40.7851, lng: -73.9683, rating: 4.8, reviewCount: 89000, openingHours: "Daily 6am-1am", imageUrl: "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800", images: ["https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800"], tags: ["park", "outdoor", "free", "iconic"] },
    { name: "The Metropolitan Museum of Art", category: "attraction", description: "One of the world's greatest art museums spanning 5,000 years of culture.", address: "1000 5th Ave, Upper East Side", city: "New York", lat: 40.7794, lng: -73.9632, rating: 4.8, reviewCount: 67000, phone: "+1-212-535-7710", openingHours: "Sun-Thu 10am-5pm, Fri-Sat 10am-9pm", imageUrl: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=800", images: ["https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=800"], tags: ["museum", "art", "culture", "world-class"] },
    { name: "Brooklyn Bridge", category: "attraction", description: "Iconic suspension bridge connecting Manhattan and Brooklyn. Walk across for stunning views.", address: "Brooklyn Bridge, New York", city: "New York", lat: 40.7061, lng: -73.9969, rating: 4.8, reviewCount: 45000, openingHours: "24/7", imageUrl: "https://images.unsplash.com/photo-1506469717960-433cebe3f181?w=800", images: ["https://images.unsplash.com/photo-1506469717960-433cebe3f181?w=800"], tags: ["bridge", "views", "walk", "iconic", "free"] },
    { name: "The High Line", category: "attraction", description: "Elevated linear park built on a former freight rail line above the streets of Manhattan.", address: "The High Line, West Side", city: "New York", lat: 40.7480, lng: -74.0048, rating: 4.7, reviewCount: 38000, openingHours: "Daily 7am-10pm", imageUrl: "https://images.unsplash.com/photo-1555448248-2571daf6344b?w=800", images: ["https://images.unsplash.com/photo-1555448248-2571daf6344b?w=800"], tags: ["park", "walking", "views", "art", "free"] },
    { name: "Museum of Modern Art (MoMA)", category: "attraction", description: "Premier collection of modern and contemporary art including Picasso, Warhol, and Monet.", address: "11 W 53rd St, Midtown", city: "New York", lat: 40.7614, lng: -73.9777, rating: 4.7, reviewCount: 54000, phone: "+1-212-708-9400", openingHours: "Sat-Mon, Wed-Thu 10:30am-5:30pm, Fri 10:30am-9pm", imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800", images: ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800"], tags: ["museum", "modern art", "culture"] },
    { name: "Brooklyn Bridge Park", category: "attraction", description: "Beautiful waterfront park with stunning views of the Manhattan skyline.", address: "Brooklyn Bridge Park, Brooklyn", city: "New York", lat: 40.7026, lng: -73.9969, rating: 4.7, reviewCount: 22000, openingHours: "Daily 6am-11pm", imageUrl: "https://images.unsplash.com/photo-1546436836-07a91091f160?w=800", images: ["https://images.unsplash.com/photo-1546436836-07a91091f160?w=800"], tags: ["park", "views", "skyline", "waterfront", "free"] },
    { name: "Times Square", category: "attraction", description: "The iconic crossroads of the world. Neon lights, Broadway shows, and endless energy.", address: "Times Square, Midtown", city: "New York", lat: 40.7580, lng: -73.9855, rating: 4.4, reviewCount: 102000, openingHours: "24/7", imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800", images: ["https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800"], tags: ["iconic", "entertainment", "shopping", "broadway"] },

    // Essentials - NYC
    { name: "Chelsea Market", category: "essentials", description: "Food hall and shopping complex in a former factory. Great for groceries and gourmet goods.", address: "75 9th Ave, Chelsea", city: "New York", lat: 40.7424, lng: -74.0058, rating: 4.5, reviewCount: 28000, openingHours: "Mon-Sat 7am-9pm, Sun 8am-8pm", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", images: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"], tags: ["market", "food hall", "shopping", "gourmet"] },
    { name: "Trader Joe's Union Square", category: "essentials", description: "Popular grocery store with great value wines and unique products.", address: "142 E 14th St, Union Square", city: "New York", lat: 40.7349, lng: -73.9899, rating: 4.4, reviewCount: 8900, openingHours: "Daily 8am-10pm", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"], tags: ["grocery", "essentials", "affordable"] },

    // Nightlife - NYC
    { name: "The Dead Rabbit", category: "nightlife", description: "Award-winning cocktail bar voted world's best multiple times.", address: "30 Water St, Financial District", city: "New York", lat: 40.7036, lng: -74.0130, rating: 4.6, reviewCount: 7800, phone: "+1-646-422-7906", openingHours: "Mon-Fri 11am-4am, Sat-Sun 10am-4am", imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800", images: ["https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800"], tags: ["cocktails", "bar", "award-winning", "irish"] },
    { name: "Employees Only", category: "nightlife", description: "Hidden speakeasy-style bar with exceptional cocktails and late-night food.", address: "510 Hudson St, West Village", city: "New York", lat: 40.7333, lng: -74.0058, rating: 4.5, reviewCount: 5400, openingHours: "Daily 6pm-4am", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800", images: ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800"], tags: ["speakeasy", "cocktails", "late night", "intimate"] },
    { name: "Output Club", category: "nightlife", description: "Brooklyn's premier dance club with world-class DJs and a stunning rooftop.", address: "74 Wythe Ave, Williamsburg", city: "New York", lat: 40.7195, lng: -73.9583, rating: 4.3, reviewCount: 3200, openingHours: "Thu-Sun 10pm-6am", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800", images: ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800"], tags: ["club", "dancing", "djs", "rooftop"] },
    { name: "Bemelmans Bar", category: "nightlife", description: "Legendary art deco bar at The Carlyle hotel with live piano and murals.", address: "35 E 76th St, Upper East Side", city: "New York", lat: 40.7754, lng: -73.9633, rating: 4.7, reviewCount: 2900, openingHours: "Mon-Sat 12pm-1am, Sun 12pm-12am", imageUrl: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800", images: ["https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800"], tags: ["cocktails", "jazz", "upscale", "historic", "piano bar"] },

    // San Francisco places for variety
    { name: "Tartine Bakery", category: "food", description: "San Francisco's legendary bakery. Country bread sells out by early afternoon.", address: "600 Guerrero St, Mission District", city: "San Francisco", lat: 37.7616, lng: -122.4241, rating: 4.7, reviewCount: 18000, openingHours: "Wed-Fri 8am-7pm, Sat-Sun 9am-7pm", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800", images: ["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800"], tags: ["bakery", "bread", "pastries", "iconic"] },
    { name: "Golden Gate Park", category: "attraction", description: "Urban park larger than Central Park with museums, gardens, and bison.", address: "Golden Gate Park, San Francisco", city: "San Francisco", lat: 37.7694, lng: -122.4862, rating: 4.8, reviewCount: 72000, openingHours: "Daily 6am-10pm", imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800", images: ["https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800"], tags: ["park", "outdoor", "free", "museums"] },
    { name: "Bi-Rite Market", category: "essentials", description: "Beloved neighborhood grocery with exceptional prepared foods and local products.", address: "3639 18th St, Mission District", city: "San Francisco", lat: 37.7616, lng: -122.4259, rating: 4.6, reviewCount: 6700, openingHours: "Daily 8am-9pm", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", images: ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"], tags: ["grocery", "local", "organic", "prepared foods"] },
    { name: "Trick Dog", category: "nightlife", description: "Innovative cocktail bar in the Mission with a theme-changing menu.", address: "3010 20th St, Mission District", city: "San Francisco", lat: 37.7589, lng: -122.4185, rating: 4.6, reviewCount: 4300, openingHours: "Daily 3pm-2am", imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800", images: ["https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800"], tags: ["cocktails", "creative", "bar", "fun"] },
    { name: "SFMOMA", category: "attraction", description: "San Francisco Museum of Modern Art with 7 floors of 20th and 21st century art.", address: "151 3rd St, SoMa", city: "San Francisco", lat: 37.7857, lng: -122.4011, rating: 4.6, reviewCount: 31000, phone: "+1-415-357-4000", openingHours: "Mon-Tue, Thu-Sun 10am-5pm", imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800", images: ["https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800"], tags: ["museum", "art", "modern", "culture"] },
    { name: "Alcatraz Island", category: "attraction", description: "Former federal penitentiary on an island in San Francisco Bay. Fascinating tours.", address: "Alcatraz Island, San Francisco Bay", city: "San Francisco", lat: 37.8269, lng: -122.4230, rating: 4.7, reviewCount: 58000, openingHours: "Daily 9am-6:30pm", imageUrl: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800", images: ["https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800"], tags: ["historic", "island", "tour", "iconic"] },
    { name: "Fisherman's Wharf", category: "attraction", description: "Waterfront neighborhood with sea lions, fresh seafood, and sourdough bread.", address: "Fisherman's Wharf, San Francisco", city: "San Francisco", lat: 37.8080, lng: -122.4177, rating: 4.3, reviewCount: 45000, openingHours: "Daily 10am-10pm", imageUrl: "https://images.unsplash.com/photo-1465190580533-c5e0e3e6e6e6?w=800", images: ["https://images.unsplash.com/photo-1465190580533-c5e0e3e6e6e6?w=800"], tags: ["waterfront", "seafood", "tourist", "sea lions"] },
    { name: "Sightglass Coffee", category: "food", description: "Third-wave coffee roaster and cafe in a stunning SoMa warehouse space.", address: "270 7th St, SoMa", city: "San Francisco", lat: 37.7757, lng: -122.4082, rating: 4.5, reviewCount: 5600, openingHours: "Mon-Fri 7am-5pm, Sat-Sun 8am-5pm", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800", images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800"], tags: ["coffee", "specialty", "workspace", "third-wave"] },
    { name: "Dandelion Chocolate", category: "food", description: "Craft bean-to-bar chocolate factory and cafe in the Mission.", address: "740 Valencia St, Mission", city: "San Francisco", lat: 37.7617, lng: -122.4214, rating: 4.6, reviewCount: 4100, openingHours: "Daily 9am-9pm", imageUrl: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800", images: ["https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800"], tags: ["chocolate", "craft", "dessert", "unique"] },
    { name: "Nopa", category: "food", description: "Beloved neighborhood restaurant known for seasonal California cuisine and late-night dining.", address: "560 Divisadero St, NoPa", city: "San Francisco", lat: 37.7741, lng: -122.4375, rating: 4.5, reviewCount: 7800, openingHours: "Daily 5pm-2am, Weekend Brunch 10am-2:30pm", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", images: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"], tags: ["california cuisine", "farm-to-table", "brunch", "late night"] },
    { name: "The Interval at Long Now", category: "nightlife", description: "Beautiful bar and cafe inside a museum focused on long-term thinking.", address: "2 Marina Blvd, Fort Mason", city: "San Francisco", lat: 37.8067, lng: -122.4323, rating: 4.7, reviewCount: 1800, openingHours: "Wed-Sun 10am-5pm", imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800", images: ["https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800"], tags: ["bar", "museum", "unique", "cocktails"] },

    // Additional variety
    { name: "Smorgasburg Brooklyn", category: "food", description: "Open-air food market every Saturday with 100 local vendors.", address: "90 Kent Ave, Williamsburg", city: "New York", lat: 40.7215, lng: -73.9612, rating: 4.6, reviewCount: 12000, openingHours: "Sat 11am-6pm", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", images: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"], tags: ["market", "food", "outdoor", "brooklyn"] },
    { name: "Prospect Park", category: "attraction", description: "Brooklyn's beloved park with a lake, forests, and meadows. Designed by Olmsted.", address: "Prospect Park, Brooklyn", city: "New York", lat: 40.6602, lng: -73.9690, rating: 4.7, reviewCount: 24000, openingHours: "Daily 5am-1am", imageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800", images: ["https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800"], tags: ["park", "nature", "lake", "free"] },
    { name: "Whitney Museum of American Art", category: "attraction", description: "Premier American art museum in the Meatpacking District with stunning views.", address: "99 Gansevoort St, Meatpacking", city: "New York", lat: 40.7396, lng: -74.0089, rating: 4.5, reviewCount: 18000, phone: "+1-212-570-3600", openingHours: "Mon-Thu, Sat-Sun 10:30am-6pm, Fri 10:30am-10pm", imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800", images: ["https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800"], tags: ["museum", "american art", "culture", "views"] },
    { name: "Eataly NYC Flatiron", category: "essentials", description: "Italian food hall with markets, restaurants, and cooking classes.", address: "200 5th Ave, Flatiron", city: "New York", lat: 40.7424, lng: -73.9886, rating: 4.4, reviewCount: 22000, openingHours: "Daily 9am-11pm", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", images: ["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"], tags: ["italian", "market", "food hall", "restaurants"] },
    { name: "Attaboy", category: "nightlife", description: "No-menu cocktail bar on the Lower East Side. Tell them your preferences.", address: "134 Eldridge St, Lower East Side", city: "New York", lat: 40.7179, lng: -73.9925, rating: 4.6, reviewCount: 2800, openingHours: "Daily 6pm-4am", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800", images: ["https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800"], tags: ["cocktails", "no menu", "speakeasy", "intimate"] },
    { name: "Mister Donut Tokyo Style", category: "food", description: "NYC outpost of the iconic Japanese donut chain with unique flavors.", address: "120 Essex St, Lower East Side", city: "New York", lat: 40.7194, lng: -73.9878, rating: 4.4, reviewCount: 3100, openingHours: "Daily 7am-9pm", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800", images: ["https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800"], tags: ["donuts", "japanese", "dessert", "unique"] },
    { name: "The Standard High Line", category: "nightlife", description: "Hip hotel bar straddling the High Line with incredible views and parties.", address: "848 Washington St, Meatpacking", city: "New York", lat: 40.7407, lng: -74.0082, rating: 4.4, reviewCount: 5700, openingHours: "Daily 11am-4am", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800", images: ["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800"], tags: ["rooftop", "hotel bar", "views", "high line"] },
    { name: "Governors Island", category: "attraction", description: "Former military base turned public park with amazing views of lower Manhattan.", address: "Governors Island, New York Harbor", city: "New York", lat: 40.6895, lng: -74.0166, rating: 4.7, reviewCount: 14000, openingHours: "May-Oct: Daily 7am-6pm", imageUrl: "https://images.unsplash.com/photo-1546436836-07a91091f160?w=800", images: ["https://images.unsplash.com/photo-1546436836-07a91091f160?w=800"], tags: ["island", "park", "views", "seasonal", "cycling"] },
    { name: "Ivan Ramen", category: "food", description: "Cult-followed ramen shop by American chef Ivan Orkin. Exceptional broth.", address: "25 Clinton St, Lower East Side", city: "New York", lat: 40.7170, lng: -73.9855, rating: 4.6, reviewCount: 4200, openingHours: "Wed-Sun 12pm-3pm, 5pm-10pm", imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800", images: ["https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800"], tags: ["ramen", "japanese", "noodles", "cult"] },
  ]).returning();

  console.log(`Inserted ${places.length} places`);

  // Seed events
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  const twoWeeks = new Date(now.getTime() + 14 * 86400000);
  const nextMonth = new Date(now.getTime() + 30 * 86400000);

  const events = await db.insert(eventsTable).values([
    { title: "Jazz Night at Village Vanguard", category: "music", venue: "Village Vanguard", address: "178 7th Ave S, Greenwich Village", city: "New York", lat: 40.7330, lng: -74.0010, startDate: tomorrow, endDate: new Date(tomorrow.getTime() + 2 * 3600000), price: 35, isFree: false, imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800", bookingUrl: "https://villagevanguard.com", tags: ["jazz", "live music", "intimate"] },
    { title: "Brooklyn Night Market", category: "food", venue: "WNYC Transmitter Park", address: "50 Greenpoint Ave, Brooklyn", city: "New York", lat: 40.7272, lng: -73.9611, startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 5 * 3600000), price: null, isFree: true, imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", tags: ["market", "food", "outdoor", "free"] },
    { title: "MoMA Late Night: Design & Innovation", category: "art", venue: "Museum of Modern Art", address: "11 W 53rd St, Midtown", city: "New York", lat: 40.7614, lng: -73.9777, startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 3 * 3600000), price: 25, isFree: false, imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800", bookingUrl: "https://moma.org", tags: ["art", "museum", "design", "evening"] },
    { title: "Rooftop Yoga in the Sky", category: "wellness", venue: "1 Hotel Brooklyn Bridge", address: "60 Furman St, Brooklyn", city: "New York", lat: 40.7026, lng: -73.9969, startDate: tomorrow, endDate: new Date(tomorrow.getTime() + 1.5 * 3600000), price: 30, isFree: false, imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800", tags: ["yoga", "wellness", "rooftop", "views"] },
    { title: "NYC Food & Wine Festival", category: "food", venue: "Hudson River Park", address: "Pier 84, Hudson River Park", city: "New York", lat: 40.7620, lng: -74.0011, startDate: twoWeeks, endDate: new Date(twoWeeks.getTime() + 48 * 3600000), price: 150, isFree: false, imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", bookingUrl: "https://nycwff.org", tags: ["food", "wine", "festival", "celebrity chefs"] },
    { title: "Central Park Summer Concert", category: "music", venue: "SummerStage at Central Park", address: "Rumsey Playfield, Central Park", city: "New York", lat: 40.7739, lng: -73.9693, startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 3 * 3600000), price: null, isFree: true, imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", tags: ["concert", "outdoor", "free", "summer"] },
    { title: "Brooklyn Art Walk", category: "art", venue: "DUMBO Arts", address: "Front St & Adams St, DUMBO", city: "New York", lat: 40.7033, lng: -73.9882, startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 4 * 3600000), price: null, isFree: true, imageUrl: "https://images.unsplash.com/photo-1561839561-b13bcfe95249?w=800", tags: ["art", "walking tour", "galleries", "free"] },
    { title: "Comedy Night at Comedy Cellar", category: "comedy", venue: "Comedy Cellar", address: "117 MacDougal St, Greenwich Village", city: "New York", lat: 40.7295, lng: -74.0003, startDate: tomorrow, endDate: new Date(tomorrow.getTime() + 2 * 3600000), price: 20, isFree: false, imageUrl: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800", tags: ["comedy", "stand-up", "intimate", "famous"] },
    { title: "San Francisco Film Festival", category: "film", venue: "Castro Theatre", address: "429 Castro St, Castro", city: "San Francisco", lat: 37.7621, lng: -122.4349, startDate: twoWeeks, endDate: new Date(twoWeeks.getTime() + 5 * 24 * 3600000), price: 18, isFree: false, imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800", bookingUrl: "https://sffs.org", tags: ["film", "festival", "cinema", "indie"] },
    { title: "Dolores Park Movie Night", category: "film", venue: "Dolores Park", address: "Dolores St & 18th St, Mission", city: "San Francisco", lat: 37.7596, lng: -122.4269, startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 3 * 3600000), price: null, isFree: true, imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800", tags: ["film", "outdoor", "free", "park"] },
    { title: "Ferry Building Farmers Market", category: "food", venue: "Ferry Building Marketplace", address: "One Ferry Building, Embarcadero", city: "San Francisco", lat: 37.7955, lng: -122.3937, startDate: tomorrow, endDate: new Date(tomorrow.getTime() + 5 * 3600000), price: null, isFree: true, imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800", tags: ["market", "food", "local", "organic", "free"] },
    { title: "SF Symphony Gala", category: "music", venue: "Davies Symphony Hall", address: "201 Van Ness Ave, Civic Center", city: "San Francisco", lat: 37.7775, lng: -122.4196, startDate: nextMonth, endDate: new Date(nextMonth.getTime() + 2.5 * 3600000), price: 95, isFree: false, imageUrl: "https://images.unsplash.com/photo-1580819775951-0a803e11aaff?w=800", bookingUrl: "https://sfsymphony.org", tags: ["symphony", "classical", "upscale", "gala"] },
    { title: "TechCrunch Disrupt After Party", category: "networking", venue: "The Regency Ballroom", address: "1300 Van Ness Ave, Civic Center", city: "San Francisco", lat: 37.7843, lng: -122.4222, startDate: nextWeek, endDate: new Date(nextWeek.getTime() + 4 * 3600000), price: 50, isFree: false, imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800", tags: ["tech", "networking", "startup", "party"] },
  ]).returning();

  console.log(`Inserted ${events.length} events`);

  // Seed deals
  const expiresOneWeek = new Date(now.getTime() + 7 * 86400000);
  const expiresTwoWeeks = new Date(now.getTime() + 14 * 86400000);
  const expiresMonth = new Date(now.getTime() + 30 * 86400000);

  const deals = await db.insert(dealsTable).values([
    { title: "20% Off All Cocktails", description: "Happy hour deal at the iconic Dead Rabbit. Valid Sunday-Thursday.", placeId: places[18]?.id, placeName: "The Dead Rabbit", category: "food", discountPercent: 20, discountText: "20% off cocktails", originalPrice: 22, dealPrice: 17.6, code: "RABBIT20", expiresAt: expiresTwoWeeks, imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800", lat: 40.7036, lng: -74.0130 },
    { title: "2-for-1 Museum Entry", description: "Buy one MoMA ticket and bring a friend for free on Friday evenings.", placeId: places[12]?.id, placeName: "Museum of Modern Art", category: "attraction", discountPercent: 50, discountText: "2-for-1 entry", originalPrice: 30, dealPrice: 15, code: "MOMA2FOR1", expiresAt: expiresMonth, imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800", lat: 40.7614, lng: -73.9777 },
    { title: "Free Cookie with Any Purchase", description: "Levain Bakery is giving away a free cookie with any purchase over $10.", placeId: places[2]?.id, placeName: "Levain Bakery", category: "food", discountPercent: null, discountText: "Free cookie on orders $10+", originalPrice: 5, dealPrice: 0, code: "FREECOOKIE", expiresAt: expiresOneWeek, imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800", lat: 40.7788, lng: -73.9813 },
    { title: "25% Off First Visit", description: "New to Sightglass? Get 25% off your first drink and any pastry.", placeId: places[27]?.id, placeName: "Sightglass Coffee", category: "food", discountPercent: 25, discountText: "25% off first visit", originalPrice: 7, dealPrice: 5.25, code: "SIGHTFIRST", expiresAt: expiresTwoWeeks, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800", lat: 37.7757, lng: -122.4082 },
    { title: "50% Off Alcatraz Night Tour", description: "Exclusive evening tour of Alcatraz with dramatic lighting and ambiance.", placeId: places[25]?.id, placeName: "Alcatraz Island", category: "attraction", discountPercent: 50, discountText: "50% off night tour", originalPrice: 60, dealPrice: 30, code: "ALCATRAZNIGHT", expiresAt: expiresMonth, imageUrl: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800", lat: 37.8269, lng: -122.4230 },
    { title: "Buy One Get One - Ramen", description: "Ivan Ramen's famous lunch special. Two bowls for the price of one.", placeId: places[39]?.id, placeName: "Ivan Ramen", category: "food", discountPercent: 50, discountText: "BOGO ramen at lunch", originalPrice: 22, dealPrice: 11, code: "IVANRAMEN2", expiresAt: expiresOneWeek, imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800", lat: 40.7170, lng: -73.9855 },
    { title: "Free Chocolate Tasting", description: "Walk-in chocolate tasting at Dandelion Chocolate — no purchase required.", placeId: places[28]?.id, placeName: "Dandelion Chocolate", category: "food", discountPercent: 100, discountText: "Free tasting session", originalPrice: 15, dealPrice: 0, code: "DANDELIONTEST", expiresAt: expiresTwoWeeks, imageUrl: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800", lat: 37.7617, lng: -122.4214 },
    { title: "Whitney Weekday Special", description: "Visit the Whitney on weekdays and save 30% on adult admission.", placeId: places[33]?.id, placeName: "Whitney Museum", category: "attraction", discountPercent: 30, discountText: "30% off weekday entry", originalPrice: 25, dealPrice: 17.5, code: "WHITNEYWKDAY", expiresAt: expiresMonth, imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800", lat: 40.7396, lng: -74.0089 },
    { title: "10% Off at Eataly", description: "Flash sale on all deli and prepared food items at Eataly Flatiron.", placeId: places[34]?.id, placeName: "Eataly NYC Flatiron", category: "essentials", discountPercent: 10, discountText: "10% off deli & prepared foods", originalPrice: null, dealPrice: null, code: "EATALY10", expiresAt: expiresOneWeek, imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", lat: 40.7424, lng: -73.9886 },
    { title: "Happy Hour at Trick Dog", description: "3-7pm daily deal: all cocktails at $3 off and bar bites half-price.", placeId: places[23]?.id, placeName: "Trick Dog", category: "food", discountPercent: null, discountText: "$3 off cocktails + 50% bar bites", originalPrice: 16, dealPrice: 13, code: "TRICKDOG3PM", expiresAt: expiresTwoWeeks, imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=800", lat: 37.7589, lng: -122.4185 },
    { title: "Smorgasburg VIP Pass", description: "Skip the lines and get first access to vendors at Smorgasburg Brooklyn.", placeName: "Smorgasburg Brooklyn", category: "food", discountPercent: null, discountText: "VIP early access pass", originalPrice: 25, dealPrice: 15, code: "SMORGVIP", expiresAt: expiresMonth, imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", lat: 40.7215, lng: -73.9612 },
    { title: "SFMOMA Members Preview", description: "Non-member preview night — see new exhibitions before they open to the public.", placeId: places[24]?.id, placeName: "SFMOMA", category: "attraction", discountPercent: null, discountText: "Preview access at member price", originalPrice: 30, dealPrice: 20, code: "SFMOMAPREV", expiresAt: nextMonth, imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800", lat: 37.7857, lng: -122.4011 },
  ]).returning();

  console.log(`Inserted ${deals.length} deals`);

  // Seed itineraries
  const [nyc1Day] = await db.insert(itinerariesTable).values({
    title: "Perfect NYC Day",
    city: "New York",
    durationDays: 1,
    description: "The ultimate one-day New York City experience hitting all the iconic spots.",
    coverImageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800",
    tips: [
      "Start early to beat the crowds at the Brooklyn Bridge",
      "Get the MoMA audio guide — it's worth it",
      "Book Joe's Pizza as a late-night snack",
      "Walk the High Line in the late afternoon for golden hour light",
    ],
  }).returning();

  const nyc1DayPlaces = [
    { name: "Brooklyn Bridge", placeIdx: 10 },
    { name: "The High Line", placeIdx: 11 },
    { name: "Chelsea Market", placeIdx: 16 },
    { name: "MoMA", placeIdx: 12 },
    { name: "Central Park", placeIdx: 8 },
    { name: "The Dead Rabbit", placeIdx: 18 },
  ];

  const stops1Day = nyc1DayPlaces
    .map((s, i) => ({
      itineraryId: nyc1Day.id,
      placeId: places[s.placeIdx]?.id ?? places[0].id,
      day: 1,
      order: i + 1,
      tip: i === 0 ? "Go at sunrise for the best photos" : i === 3 ? "Pre-book online to skip the queue" : null,
      bestTimeToVisit: i === 0 ? "Early morning" : i === 2 ? "Lunchtime" : i === 5 ? "Evening" : null,
      estimatedCost: i === 1 ? "Free" : i === 2 ? "$15-30" : i === 3 ? "$30" : i === 5 ? "$20-30" : "Free",
      durationMinutes: [60, 90, 60, 120, 90, 120][i],
    }));

  await db.insert(itineraryStopsTable).values(stops1Day);

  const [nyc3Day] = await db.insert(itinerariesTable).values({
    title: "NYC in 3 Days",
    city: "New York",
    durationDays: 3,
    description: "A deep dive into New York City's neighborhoods, culture, and food scene.",
    coverImageUrl: "https://images.unsplash.com/photo-1506469717960-433cebe3f181?w=800",
    tips: [
      "Get a MetroCard for unlimited subway rides",
      "Visit museums on Friday evenings for late hours",
      "Try to get reservations 2-3 weeks in advance for popular restaurants",
      "Wear comfortable shoes — expect to walk 5-8 miles per day",
      "The L train connects Manhattan to Williamsburg quickly",
    ],
  }).returning();

  const stops3Day = [
    { placeIdx: 10, day: 1, order: 1, tip: "Walk across at sunrise", bestTimeToVisit: "Early morning", estimatedCost: "Free", durationMinutes: 60 },
    { placeIdx: 14, day: 1, order: 2, tip: "Take the ferry from Manhattan for the best approach", bestTimeToVisit: "Morning", estimatedCost: "Free", durationMinutes: 120 },
    { placeIdx: 5, day: 1, order: 3, bestTimeToVisit: "Lunch", estimatedCost: "$5-10", durationMinutes: 30 },
    { placeIdx: 3, day: 1, order: 4, bestTimeToVisit: "Afternoon", estimatedCost: "$20-30", durationMinutes: 60 },
    { placeIdx: 18, day: 1, order: 5, bestTimeToVisit: "Evening", estimatedCost: "$20-30", durationMinutes: 120 },
    { placeIdx: 8, day: 2, order: 1, tip: "Rent a Citi Bike to explore", bestTimeToVisit: "Morning", estimatedCost: "Free", durationMinutes: 120 },
    { placeIdx: 9, day: 2, order: 2, bestTimeToVisit: "Midday", estimatedCost: "$30 entry", durationMinutes: 180 },
    { placeIdx: 0, day: 2, order: 3, bestTimeToVisit: "Late afternoon", estimatedCost: "$10-15", durationMinutes: 30 },
    { placeIdx: 19, day: 2, order: 4, bestTimeToVisit: "Evening", estimatedCost: "$20-30", durationMinutes: 90 },
    { placeIdx: 11, day: 3, order: 1, tip: "Enter at Gansevoort St for the best start", bestTimeToVisit: "Morning", estimatedCost: "Free", durationMinutes: 90 },
    { placeIdx: 16, day: 3, order: 2, bestTimeToVisit: "Lunch", estimatedCost: "$15-25", durationMinutes: 60 },
    { placeIdx: 12, day: 3, order: 3, tip: "Free entry on Fridays after 5:30pm", bestTimeToVisit: "Afternoon", estimatedCost: "$25 (or free Fri eve)", durationMinutes: 120 },
    { placeIdx: 7, day: 3, order: 4, bestTimeToVisit: "Dinner", estimatedCost: "$15-25", durationMinutes: 45 },
    { placeIdx: 21, day: 3, order: 5, bestTimeToVisit: "Late night", estimatedCost: "$20-30", durationMinutes: 120 },
  ];

  await db.insert(itineraryStopsTable).values(
    stops3Day.map((s) => ({
      itineraryId: nyc3Day.id,
      placeId: places[s.placeIdx]?.id ?? places[0].id,
      day: s.day,
      order: s.order,
      tip: s.tip ?? null,
      bestTimeToVisit: s.bestTimeToVisit ?? null,
      estimatedCost: s.estimatedCost ?? null,
      durationMinutes: s.durationMinutes ?? null,
    }))
  );

  const [sf1Day] = await db.insert(itinerariesTable).values({
    title: "San Francisco in a Day",
    city: "San Francisco",
    durationDays: 1,
    description: "The best of the Bay Area condensed into one perfect day.",
    coverImageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800",
    tips: [
      "The weather changes quickly — bring a light jacket",
      "Book Alcatraz tickets weeks in advance",
      "Try the sourdough bread at Boudin on Fisherman's Wharf",
      "Golden Gate Park is best explored by bike",
    ],
  }).returning();

  const stops1DaySF = [
    { placeIdx: 25, day: 1, order: 1, tip: "Book in advance — sells out fast", bestTimeToVisit: "Morning", estimatedCost: "$40-60", durationMinutes: 150 },
    { placeIdx: 26, day: 1, order: 2, bestTimeToVisit: "Midday", estimatedCost: "Free", durationMinutes: 90 },
    { placeIdx: 22, day: 1, order: 3, bestTimeToVisit: "Afternoon", estimatedCost: "$5-10", durationMinutes: 60 },
    { placeIdx: 21, day: 1, order: 4, bestTimeToVisit: "Late afternoon", estimatedCost: "$30 entry", durationMinutes: 120 },
    { placeIdx: 27, day: 1, order: 5, bestTimeToVisit: "Evening", estimatedCost: "$5-15", durationMinutes: 45 },
    { placeIdx: 29, day: 1, order: 6, bestTimeToVisit: "Dinner", estimatedCost: "$40-70", durationMinutes: 120 },
  ];

  await db.insert(itineraryStopsTable).values(
    stops1DaySF.map((s) => ({
      itineraryId: sf1Day.id,
      placeId: places[s.placeIdx]?.id ?? places[0].id,
      day: s.day,
      order: s.order,
      tip: s.tip ?? null,
      bestTimeToVisit: s.bestTimeToVisit ?? null,
      estimatedCost: s.estimatedCost ?? null,
      durationMinutes: s.durationMinutes ?? null,
    }))
  );

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
