/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://fuelist.in',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'weekly',
  priority: 0.7,

  // Exclude private/auth pages from the generated sitemap.xml
  exclude: ['/orders', '/orders/*', '/account', '/admin', '/admin/*', '/payment/*'],

  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      // Prevent crawling of private and admin pages
      { userAgent: '*', disallow: ['/orders', '/account', '/admin', '/payment'] },
    ],
    // Explicitly list the sitemap — some crawlers look for this
    additionalSitemaps: ['https://fuelist.in/sitemap.xml'],
  },
}
