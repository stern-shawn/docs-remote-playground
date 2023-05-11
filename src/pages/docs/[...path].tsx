import { getAllPaths } from '@/util/getPaths';
import { remarkCodeHike } from '@code-hike/mdx';
import { CH } from '@code-hike/mdx/components';
import { Anchor, isExternalUrl } from '@twilio-paste/anchor';
import { Box } from '@twilio-paste/box';
import { Heading } from '@twilio-paste/heading';
import { InlineCode } from '@twilio-paste/inline-code';
import { ListItem, OrderedList, UnorderedList } from '@twilio-paste/list';
import { Paragraph } from '@twilio-paste/paragraph';
import { Separator } from '@twilio-paste/separator';
import { TBody, TFoot, THead, Table, Td, Th, Tr } from '@twilio-paste/table';

import { MDXComponents } from 'mdx/types';
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import path from 'path';
import { ReactNode } from 'react';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkToc from 'remark-toc';
import theme from 'shiki/themes/material-default.json';

const components: MDXComponents = {
  CH,
  //* Replace anchor tags w/ Nextjs Links to get pre-fetch on hover, etc
  //! TS generates an error re legacy ref usage, destructure and avoid using the ref prop
  a: ({ children, href = '', ref: _legacyRef, ...props }) => {
    return (
      <Link {...props} href={href} legacyBehavior passHref>
        <Anchor href={href} showExternal={isExternalUrl(href)}>
          {children as NonNullable<ReactNode>}
        </Anchor>
      </Link>
    );
  },
  p: ({ id, className, ref: _legacyRef, ...props }) => {
    return <Paragraph {...props} />;
  },
  h1: ({ className, ref: _legacyRef, ...props }) => {
    return <Heading as="h1" variant="heading10" {...props} />;
  },
  h2: ({ className, ref: _legacyRef, ...props }) => {
    return <Heading as="h2" variant="heading20" {...props} />;
  },
  h3: ({ className, ref: _legacyRef, ...props }) => {
    return <Heading as="h3" variant="heading30" {...props} />;
  },
  h4: ({ className, ref: _legacyRef, ...props }) => {
    return <Heading as="h4" variant="heading40" {...props} />;
  },
  h5: ({ className, ref: _legacyRef, ...props }) => {
    return <Heading as="h5" variant="heading50" {...props} />;
  },
  h6: ({ className, ref: _legacyRef, ...props }) => {
    return <Heading as="h6" variant="heading60" {...props} />;
  },
  ul: ({ className, ref, id, style, ...props }) => <UnorderedList {...props} />,
  ol: ({ className, ref, id, style, ...props }) => <OrderedList {...props} />,
  li: ({ className, ref, id, style, ...props }) => <ListItem {...props} />,
  hr: ({ className, ref, id, ...props }) => (
    <Separator {...props} orientation="horizontal" verticalSpacing="space100" />
  ),
  table: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <Box marginBottom="space60">
      <Table scrollHorizontally tableLayout="fixed" {...props}>
        {children as NonNullable<ReactNode>}
      </Table>
    </Box>
  ),
  thead: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <THead {...props}>{children as NonNullable<ReactNode>}</THead>
  ),
  tbody: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <TBody {...props}>{children as NonNullable<ReactNode>}</TBody>
  ),
  tfoot: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <TFoot {...props}>{children as NonNullable<ReactNode>}</TFoot>
  ),
  tr: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <Tr {...props}>{children as NonNullable<ReactNode>}</Tr>
  ),
  th: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <Th {...props}>{children as NonNullable<ReactNode>}</Th>
  ),
  td: ({ children, className, ref, id, ...props }): React.ReactElement => (
    <Td {...props}>{children as NonNullable<ReactNode>}</Td>
  ),
  code: ({ children }) => {
    return <InlineCode>{children as string}</InlineCode>;
  },
};

export default function TestPage({
  source,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return <MDXRemote {...source} components={components} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const docsDirectory = path.resolve(process.cwd(), 'docs');
  const fsPaths = await getAllPaths(docsDirectory);
  const mdxRegEx = new RegExp(/\.mdx$/);
  const paths = fsPaths.reduce<string[][]>((acc, currPath) => {
    if (path.extname(currPath) === '.mdx') {
      acc.push(
        currPath
          .replace(mdxRegEx, '')
          .replace(`${docsDirectory}/`, '')
          .split('/')
      );
    }

    return acc;
  }, []);

  return {
    paths: paths.map((path) => ({
      params: { path },
    })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<{
  source: MDXRemoteSerializeResult;
}> = async (context) => {
  const requestedPath = context.params?.path;
  if (!requestedPath) return { notFound: true };

  //? For demonstration purposes, this is grabbing the docs directory from the
  // local filesystem. This can be replaced by an API call, db, etc

  const filePath = Array.isArray(requestedPath)
    ? path.resolve(process.cwd(), 'docs', ...requestedPath)
    : path.resolve(process.cwd(), 'docs', requestedPath);

  const markdown = await readFile(`${filePath}.mdx`, {
    encoding: 'utf-8',
  }).catch(async (error) => {
    // If the file wasn't found, the user is possibly requesting an 'index' page
    // for a given route. Check for an index.mdx file before completely deciding
    // that this is an error or 404
    if (error?.errno === -2) {
      return await readFile(`${filePath}/index.mdx`, {
        encoding: 'utf-8',
      }).catch((error) => {
        console.error({
          context: 'page generation index fallback check',
          error,
          filePath,
        });

        return undefined;
      });
    }

    console.error({ context: 'page generation', error, filePath });
    return undefined;
  });

  if (!markdown) {
    return { notFound: true };
  }

  const mdxSource = await serialize(markdown, {
    mdxOptions: {
      remarkPlugins: [
        [remarkCodeHike, { autoImport: false, theme, showCopyButton: true }],
        // generates a table of contents based on headings
        [remarkToc, { tight: true }],
      ],
      useDynamicImport: true,
      // These work together to add IDs and linkify headings
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    },
  });

  // TODO: Check if there's a way to do github webhook + on-demand revalidation:
  // https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration#on-demand-revalidation
  return { props: { source: mdxSource }, revalidate: 60 };
};
