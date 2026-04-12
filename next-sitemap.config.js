/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://fuelist.in',
  generateRobotsTxt: true, // auto creates robots.txt
  sitemapSize: 7000,

  changefreq: 'weekly',
  priority: 0.7,

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
}