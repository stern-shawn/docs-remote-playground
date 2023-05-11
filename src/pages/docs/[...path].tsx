import { readFile } from 'node:fs/promises';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { remarkCodeHike } from '@code-hike/mdx';
import { CH } from '@code-hike/mdx/components';
import theme from 'shiki/themes/material-default.json';
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import { getAllPaths } from '@/util/getPaths';
import Link from 'next/link';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// TODO: refactor elsewhere, types, etc
const components = {
  CH,
  // Replace anchor tags w/ Nextjs Links to get pre-fetch on hover, etc
  a: (props: any) => <Link {...props} />,
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
