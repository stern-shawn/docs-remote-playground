import { readFile } from 'node:fs/promises';
import path from 'path';
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote } from 'next-mdx-remote';
import { remarkCodeHike } from '@code-hike/mdx';
import { CH } from '@code-hike/mdx/components';
import theme from 'shiki/themes/material-default.json';
import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';

const components = { CH };

export default function TestPage({
  source,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} components={components} />
    </div>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const requestedPath = context.params?.path;
  if (!requestedPath) return { notFound: true };

  const filePath = Array.isArray(requestedPath)
    ? path.resolve(process.cwd(), 'docs', ...requestedPath)
    : path.resolve(process.cwd(), 'docs', requestedPath);

  const markdown = await readFile(`${filePath}.mdx`, {
    encoding: 'utf-8',
  }).catch(async (error) => {
    console.error({ context: 'page generation', error, filePath });

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

    return undefined;
  });

  if (!markdown) {
    return { notFound: true };
  }

  const mdxSource = await serialize(markdown, {
    mdxOptions: {
      remarkPlugins: [[remarkCodeHike, { autoImport: false, theme }]],
      useDynamicImport: true,
    },
  });

  return { props: { source: mdxSource } };
};
