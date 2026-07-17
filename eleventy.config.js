// Eleventy build for the WOPHA site. Plain Eleventy, NO plugins — the spec's
// bus-factor rule (spec §9): a future maintainer needs only front matter,
// one layout, and {% include %}. Pages live in src/, shared markup in
// src/_includes/, output goes to _site/ (gitignored; never edit it).
export default function (eleventyConfig) {
  // Static files shipped to _site/ unchanged (same URLs as today).
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/documents");
  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addPassthroughCopy("src/sw.js");
  eleventyConfig.addPassthroughCopy("src/portal/portal.js");
  eleventyConfig.addPassthroughCopy("src/portal/portal-shell.js");
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    // Page sources are .html files; render them with Nunjucks so they can
    // use front matter, the base layout, and includes.
    htmlTemplateEngine: "njk",
  };
}
