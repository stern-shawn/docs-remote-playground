import { remarkCodeHike } from '@code-hike/mdx';

import { SerializeOptions } from 'next-mdx-remote/dist/types';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkToc from 'remark-toc';
import theme from 'shiki/themes/material-default.json';

import { remarkOpenApiSpecs } from './replaceApiSpec';

export const mdxSerializeConfig: SerializeOptions = {
  mdxOptions: {
    remarkPlugins: [
      [remarkOpenApiSpecs],
      // Syntax highlighting in code blocks + magic/interactive educational experiences
      [remarkCodeHike, { autoImport: false, theme, showCopyButton: true }],
      // generates a table of contents based on headings
      [remarkToc, { tight: true }],
    ],
    useDynamicImport: true,
    // These work together to add IDs and linkify headings
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
};
