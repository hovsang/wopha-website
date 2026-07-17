// The community page uses a folder-style URL (/community/) instead of the
// site-wide flat *.html permalink that src/src.11tydata.js computes for
// every page. This page sets its own `permalink` in front matter, so pass
// it through unchanged rather than flattening it.
export default {
  eleventyComputed: {
    permalink: (data) => data.permalink,
  },
};
