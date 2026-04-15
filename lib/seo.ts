/**
 * Fuelist SEO Configuration
 * Centralized registry for all meta tags, social sharing, and structured data.
 */

export const SITE_CONFIG = {
  name: 'Fuelist',
  url: 'https://fuelist.in',
  location: 'Delhi',
  region: 'Delhi-NCR',
  country: 'India',
  contact: {
    phone: '',
    email: 'hello@fuelist.in',
  },
  social: {
    twitter: '@fuelist_in',
    instagram: '@fuelist.in',
  },
  keywords: [
    'fresh fruit bowl',
    'cut fruits near me',
    'fruit delivery delhi',
    'healthy breakfast bowls',
    'high protein bowls delhi',
    'clean eating delhi',
    'macro friendly meals',
    'healthy food delivery delhi',
  ],
}

export const SEO_CONFIG = {
  home: {
    title: 'Fuelist — Fresh Fruit Bowls & Healthy Meals Delivered in Delhi',
    description: 'Order handcrafted, fresh fruit bowls and high-protein meals delivered across Delhi. Real ingredients, full macro transparency, and zero compromise on taste.',
    keywords: SITE_CONFIG.keywords.join(', '),
  },
  menu: {
    title: 'Menu | Fresh Fruit & Power Bowls',
    description: 'Explore our range of premium fruit bowls, overnight oats, and high-performance power bowls. Nutritious, fresh, and delivered to your doorstep.',
  },
  about: {
    title: 'Our Story | Clean Eating Reimagined',
    description: 'Learn how Fuelist is redefining fast food with fresh, real ingredients and total macro transparency for high-performance living.',
  },
  contact: {
    title: 'Contact Us | Fruit Delivery Queries',
    description: 'Get in touch with Fuelist for support, bulk orders, or catering inquiries in Delhi-NCR.',
  },
  // Specialized SEO Landing Zones
  fruitDeliveryDelhi: {
    title: 'Fruit Delivery in Delhi | Fresh Fruit Bowls at Your Doorstep',
    description: 'Looking for fast fruit delivery in Delhi? Fuelist offers premium, hand-cut fruit bowls made with seasonal ingredients. Order now for instant delivery.',
    h1: 'Fresh Fruit Delivery across Delhi-NCR',
  },
  freshFruitBowls: {
    title: 'Fresh Fruit Bowls | Organic & Seasonal Fruit Platters',
    description: 'The best fresh fruit bowls in Delhi. Sourced daily, precision-cut, and packed with nutrients. Elevate your daily nutrition with Fuelist.',
    h1: 'Premium Fresh Fruit Bowls',
  },
  cutFruitsNearMe: {
    title: 'Cut Fruits Near Me | Ready-to-Eat Fresh Fruit Bowls',
    description: 'Search for "cut fruits near me"? Fuelist delivers fresh, hygienically packed, and ready-to-eat fruit bowls directly to your home or office.',
    h1: 'Freshly Cut Fruits Delivered Near You',
  },
}

/**
 * Generates Structured Data for LocalBusiness
 */
export const getLocalBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  '@id': `${SITE_CONFIG.url}/#local-business`,
  'name': SITE_CONFIG.name,
  'url': SITE_CONFIG.url,
  'logo': `${SITE_CONFIG.url}/android-chrome-512x512.png`,
  'image': `${SITE_CONFIG.url}/images/hero-bowl.png`,
  'description': SEO_CONFIG.home.description,
  'telephone': SITE_CONFIG.contact.phone || undefined,
  'email': SITE_CONFIG.contact.email,
  'priceRange': '$$',
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': 'Building No. 123, Hauz Khas',
    'addressLocality': 'Delhi',
    'addressRegion': 'Delhi',
    'postalCode': '110016',
    'addressCountry': 'IN',
  },
  'geo': {
    '@type': 'GeoCoordinates',
    'latitude': 28.5494,
    'longitude': 77.2001,
  },
  'servesCuisine': 'Healthy, Fruits, Bowls',
  'areaServed': [
    {
      '@type': 'City',
      'name': 'Delhi',
    },
    {
      '@type': 'City',
      'name': 'Gurgaon',
    },
    {
      '@type': 'City',
      'name': 'Noida',
    },
  ],
  'openingHoursSpecification': [
    {
      '@type': 'OpeningHoursSpecification',
      'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      'opens': '08:00',
      'closes': '22:00',
    },
  ],
})

/**
 * Generates FAQ Schema for SEO
 */
export const getFAQSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': [
    {
      '@type': 'Question',
      'name': 'Does Fuelist deliver original fresh fruit bowls in Delhi?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Yes, Fuelist specializes in handcrafted fresh fruit bowls delivered across Delhi, Gurgaon, and Noida using seasonal ingredients sourced daily.',
      },
    },
    {
      '@type': 'Question',
      'name': 'Are the macros mentioned for each bowl accurate?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Absolutely. Every Fuelist bowl comes with full macro transparency, listing exact calories, protein, carbs, and fats so you can track your nutrition with precision.',
      },
    },
    {
      '@type': 'Question',
      'name': 'What is the delivery time for breakfast bowls?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'We offer instant delivery across major parts of Delhi-NCR. Typically, our breakfast and fruit bowls reach you within 30-45 minutes of ordering.',
      },
    },
  ],
})
