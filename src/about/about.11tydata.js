// The about section uses folder-style URLs (/about/board/, etc.)
// instead of the site-wide flat *.html permalinks that src/src.11tydata.js
// computes for every page. These pages set their own `permalink` in front
// matter, so pass it through unchanged rather than flattening it.
export default {
  eleventyComputed: {
    permalink: (data) => data.permalink,
  },
};
