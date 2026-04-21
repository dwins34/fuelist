/**
 * Fuelist SEO Configuration
 * Centralised registry for all meta tags, social sharing, and structured data.
 */

export const SITE_CONFIG = {
  name: 'Fuelist',
  tagline: 'Fresh Fruit Bowls & Healthy Meals Delivered',
  url: 'https://fuelist.in',
  country: 'India',
  contact: {
    phone: '',
    email: 'hello@fuelist.in',
  },
  social: {
    twitter: '@fuelist_in',
    instagram: '@fuelist.in',
  },

  // ── Generic, city-agnostic keywords ──────────────────────────────────────
  keywords: [
    // Intent — discovery
    'fresh fruit bowl',
    'fruit bowl delivery',
    'cut fruits near me',
    'fresh fruits delivered',
    'healthy food delivery',
    'healthy breakfast delivery',
    // Category — product
    'fruit bowl online',
    'seasonal fruit bowl',
    'handcrafted fruit bowls',
    'ready to eat fruit bowl',
    // Category — bowls
    'power bowl delivery',
    'high protein bowl',
    'breakfast bowl delivery',
    'overnight oats delivery',
    'smoothie bowl delivery',
    // Category — drinks
    'fresh juice delivery',
    'craft juice near me',
    'cold pressed juice delivery',
    'protein shake delivery',
    // Intent — nutrition
    'macro friendly meals',
    'low calorie meals delivered',
    'clean eating delivery',
    'calorie counted food delivery',
    'high protein meal delivery',
    // Intent — subscription
    'daily meal subscription',
    'healthy meal subscription',
    'fruit bowl subscription',
    'breakfast subscription plan',
    // Brand
    'fuelist',
    'fuelist bowls',
    'fuelist subscription',
    //Extra
    'healthy food near me',
    'cut fruits delivery',
    'fresh fruit delivery',
    "healthy breakfast near me",
    'healthy lunch delivery',
    'healthy dinner delivery',
    'healthy snacks delivery',
    'fruit delivery near me',
    'fruit subscription delivery',
    'healthy meal delivery near me',
    'healthy food delivery near me',
    'healthy breakfast delivery near me',
    'healthy lunch delivery near me',
    'healthy dinner delivery near me',
    'healthy snacks delivery near me',
    'cut fruits delivery near me',
    'fresh fruit delivery near me',
    'fruit bowl delivery near me',
  ],
}

// ── Per-page SEO configs ───────────────────────────────────────────────────

export const SEO_CONFIG = {
  home: {
    title: 'Fuelist — Fresh Fruit Bowls & Healthy Meals Delivered',
    description:
      'Order handcrafted fresh fruit bowls, power bowls, overnight oats, and juices delivered to your door. Real ingredients, full macro transparency, zero compromise on taste.',
    keywords: SITE_CONFIG.keywords.join(', '),
  },

  menu: {
    title: 'Menu | Fresh Fruit Bowls, Power Bowls, Juices & Shakes',
    description:
      "Explore Fuelist's full menu — seasonal fruit bowls, high-protein power bowls, overnight oats, fresh craft juices, and protein shakes. Nutritious, fresh, delivered daily.",
    keywords: [
      'fresh fruit bowls menu',
      'power bowls online',
      'overnight oats delivery',
      'craft juices near me',
      'protein shakes delivery',
      'healthy breakfast menu',
      'calorie counted food',
      'high protein breakfast delivery',
    ].join(', '),
  },

  // ── Category-specific pages (used in /menu?category=X structured data) ──
  categories: {
    fruit: {
      title: 'Fruit Bowls | Fresh Seasonal Fruit Delivered',
      description:
        'Hand-cut, seasonal fruit bowls made fresh daily. No preservatives, no sugar — just real whole fruits packed with vitamins and natural energy.',
      keywords:
        'fruit bowl delivery, fresh fruit bowl, seasonal fruit bowl, cut fruits near me, ready to eat fruit, vitamin rich breakfast',
    },
    breakfast: {
      title: 'Breakfast Bowls | Overnight Oats & Morning Meals',
      description:
        'Start your morning right with overnight oats and wholesome breakfast bowls — prepared fresh every day and delivered to your door.',
      keywords:
        'breakfast bowl delivery, overnight oats delivery, healthy breakfast near me, morning meal delivery, oats bowl, wholesome breakfast',
    },
    power: {
      title: 'Power Bowls | High Protein Performance Meals',
      description:
        'Fuel your workout and recovery with our high-protein power bowls — macro-balanced, calorie-counted, and made with clean ingredients.',
      keywords:
        'power bowl delivery, high protein bowl, macro friendly meal, clean eating delivery, gym meal delivery, performance food, protein meal delivery',
    },
    shakes: {
      title: 'Protein Shakes | Natural Shakes Delivered Fresh',
      description:
        'Natural, blended protein shakes with no artificial flavours. Perfect post-workout fuel delivered fresh to your door.',
      keywords:
        'protein shake delivery, natural protein shake, fresh shake delivery, post workout shake, gym shake near me',
    },
    craft_juices: {
      title: 'Craft Juices | Fresh Cold-Pressed Juices Delivered',
      description:
        'Cold-pressed and freshly blended craft juices made from seasonal fruits. No concentrates, no additives — just pure, natural juice delivered daily.',
      keywords:
        'craft juice delivery, cold pressed juice near me, fresh juice delivery, natural fruit juice, healthy juice subscription',
    },
  },

  about: {
    title: 'Our Story | Real Food, Real Nutrition — Fuelist',
    description:
      'Fuelist was built to make clean, nutritious eating effortless. Fresh ingredients, full macro transparency, and a subscription that adapts to your lifestyle.',
    keywords:
      'healthy food brand, clean eating company, nutritious meal delivery brand, fuelist story, macro transparent food',
  },

  contact: {
    title: 'Contact Us | Fuelist Support & Bulk Orders',
    description:
      'Get in touch with Fuelist for support, bulk corporate orders, or catering inquiries. We respond within a few hours.',
    keywords:
      'fuelist contact, healthy food bulk order, corporate meal delivery, catering healthy food, fruit bowl catering',
  },

  // ── SEO landing zones (standalone pages) ─────────────────────────────────
  // Aliases kept for existing landing-page files
  freshFruitBowls: {
    title: 'Fresh Fruit Bowls | Handcrafted & Delivered Daily',
    description:
      'Premium fresh fruit bowls made with seasonal whole fruits — hygienically packed and delivered to your home or office. Order now.',
    h1: 'Premium Fresh Fruit Bowls Delivered',
    keywords:
      'fresh fruit bowl delivery, fruit bowl near me, seasonal fruit bowl, handcrafted fruit bowl, healthy fruit delivery',
  },
  fruitDeliveryDelhi: {
    title: 'Fruit Delivery | Fresh Fruits at Your Doorstep',
    description:
      'Fast, reliable fresh fruit delivery — handcrafted bowls made from seasonal fruits and delivered the same day. Subscribe for daily deliveries.',
    h1: 'Fresh Fruit Delivery at Your Doorstep',
    keywords:
      'fruit delivery, fresh fruit delivered, same day fruit delivery, online fruit order, fruit subscription',
  },
  fruitBowls: {
    title: 'Fresh Fruit Bowls | Handcrafted & Delivered Daily',
    description:
      'Premium fresh fruit bowls made with seasonal whole fruits — hygienically packed and delivered to your home or office. Order now.',
    h1: 'Premium Fresh Fruit Bowls Delivered',
    keywords:
      'fresh fruit bowl delivery, fruit bowl near me, seasonal fruit bowl, handcrafted fruit bowl, healthy fruit delivery',
  },
  cutFruitsNearMe: {
    title: 'Cut Fruits Near Me | Ready-to-Eat Fresh Fruit Bowls',
    description:
      'Looking for cut fruits near you? Fuelist delivers freshly cut, hygienically packed, ready-to-eat fruit bowls directly to your home or office.',
    h1: 'Freshly Cut Fruits Delivered To You',
    keywords:
      'cut fruits near me, ready to eat fruit, fresh cut fruit delivery, fruit near me, fruit on demand',
  },
  fruitDelivery: {
    title: 'Fruit Delivery | Fresh Fruits at Your Doorstep',
    description:
      'Fast, reliable fresh fruit delivery — handcrafted bowls made from seasonal fruits and delivered the same day. Subscribe for daily deliveries.',
    h1: 'Fresh Fruit Delivery at Your Doorstep',
    keywords:
      'fruit delivery, fresh fruit delivered, same day fruit delivery, online fruit order, fruit subscription',
  },
}

// ── Structured Data ────────────────────────────────────────────────────────

export const getLocalBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  '@id': `${SITE_CONFIG.url}/#local-business`,
  'name': SITE_CONFIG.name,
  'url': SITE_CONFIG.url,
  'logo': `${SITE_CONFIG.url}/android-chrome-512x512.png`,
  'image': `${SITE_CONFIG.url}/images/hero-bowl.png`,
  'description': SEO_CONFIG.home.description,
  'email': SITE_CONFIG.contact.email,
  'priceRange': '₹₹',
  'servesCuisine': ['Healthy', 'Fruit Bowls', 'Power Bowls', 'Juices', 'Protein Shakes'],
  'hasMenu': `${SITE_CONFIG.url}/menu`,
  'openingHoursSpecification': [
    {
      '@type': 'OpeningHoursSpecification',
      'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      'opens': '08:00',
      'closes': '22:00',
    },
  ],
  'sameAs': [
    `https://www.instagram.com/fuelist.in`,
    `https://twitter.com/fuelist_in`,
  ],
})

export const getMenuItemListSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'name': 'Fuelist Menu Categories',
  'url': `${SITE_CONFIG.url}/menu`,
  'itemListElement': [
    {
      '@type': 'ListItem',
      'position': 1,
      'name': 'Fruit Bowls',
      'description': 'Fresh seasonal fruit bowls — hand-cut, hygienically packed, delivered daily.',
      'url': `${SITE_CONFIG.url}/menu?category=fruit`,
    },
    {
      '@type': 'ListItem',
      'position': 2,
      'name': 'Breakfast Bowls',
      'description': 'Wholesome overnight oats and morning bowls delivered fresh every day.',
      'url': `${SITE_CONFIG.url}/menu?category=breakfast`,
    },
    {
      '@type': 'ListItem',
      'position': 3,
      'name': 'Power Bowls',
      'description': 'High-protein, macro-balanced power bowls for performance and recovery.',
      'url': `${SITE_CONFIG.url}/menu?category=power`,
    },
    {
      '@type': 'ListItem',
      'position': 4,
      'name': 'Protein Shakes',
      'description': 'Natural blended protein shakes with no artificial additives.',
      'url': `${SITE_CONFIG.url}/menu?category=shakes`,
    },
    {
      '@type': 'ListItem',
      'position': 5,
      'name': 'Craft Juices',
      'description': 'Cold-pressed and freshly blended craft juices from seasonal fruits.',
      'url': `${SITE_CONFIG.url}/menu?category=craft_juices`,
    },
  ],
})

export const getFAQSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': [
    {
      '@type': 'Question',
      'name': 'What types of food does Fuelist deliver?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Fuelist delivers fresh fruit bowls, high-protein power bowls, overnight oats, craft juices, and protein shakes — all made fresh daily with seasonal ingredients.',
      },
    },
    {
      '@type': 'Question',
      'name': 'Does Fuelist show macros for each item?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Yes. Every item on the Fuelist menu lists exact calories, protein, carbs, and fat so you can track your nutrition with full precision.',
      },
    },
    {
      '@type': 'Question',
      'name': 'Can I subscribe to daily deliveries?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Absolutely. Fuelist offers daily, weekday, and weekend subscription plans for 7, 14, or 30 days — with up to 10% off on longer plans.',
      },
    },
    {
      '@type': 'Question',
      'name': 'Are the fruit bowls made fresh every day?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Yes. All Fuelist bowls are handcrafted fresh each morning using seasonal whole fruits with no preservatives or artificial flavours.',
      },
    },
    {
      '@type': 'Question',
      'name': 'How do I track my subscription deliveries?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'You can track all upcoming and past deliveries in real time from your Fuelist account dashboard after placing a subscription.',
      },
    },
  ],
})

export const getWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'url': SITE_CONFIG.url,
  'name': SITE_CONFIG.name,
  'description': SEO_CONFIG.home.description,
  'potentialAction': {
    '@type': 'SearchAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': `${SITE_CONFIG.url}/menu?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
})
