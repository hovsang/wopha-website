// Keep today's flat *.html URLs. Without this Eleventy would write
// pool.html to /pool/index.html ("cool URI" default). URL restructuring
// belongs to the public-site redesign plan, not the tooling migration.
export default {
  eleventyComputed: {
    permalink: (data) => `${data.page.filePathStem}.html`,
  },
};
