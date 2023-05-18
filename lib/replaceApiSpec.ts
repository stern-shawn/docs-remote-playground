import { valueToEstree } from 'estree-util-value-to-estree';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import type { Code, Parent } from 'mdast';
import { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import * as nodePath from 'path';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import { z } from 'zod';

const SpecConfigSchema = z.object({
  specName: z.string({
    required_error:
      'Please provide a proper specName for your endpoint, such as twilio_messaging_v1',
  }),
  path: z.string({
    required_error:
      'Please provide a correct path, such as /2010-04-01/Accounts/{Sid}',
  }),
  method: z.string({
    required_error:
      'Please provide one HTTP method that you need documentation for (GET, POST, etc)',
  }),
});

type SpecConfig = z.infer<typeof SpecConfigSchema>;

export function remarkOpenApiSpecs() {
  return function transformApiSpecs(tree: Node) {
    visit(tree, 'code', (node: Code, index: number | null, parent: Parent) => {
      if (
        !(
          node.type === 'code' &&
          node.lang === 'automatic-api-spec' &&
          typeof index === 'number'
        )
      ) {
        //?  early return, node isn't a spec block to modify
        return;
      }

      const config = SpecConfigSchema.parse(yaml.load(node.value));
      const { specName, path, method } = config;

      //? Abstraction, could be an API call to GH at some point
      // ideally, maybe initially grab and merge all specs into memory prior to mdx parsing so we
      // only have a single read/parse step instead of per-mdx
      const spec = JSON.parse(
        readFileSync(
          nodePath.resolve(process.cwd(), 'openapi', `${specName}.json`),
          'utf-8'
        )
      );

      const pathData = spec.paths[path];

      const {
        servers = [],
        description = '',
        'x-twilio': xTwilio = {},
        // Not sure if we can assume all remaining properties are methods, but could potentially
        // expand autogeneration by doing methods.map((method) => pathData[method]...) instead of
        // using the single method provided in the markdown
        ...methods
      } = pathData;

      const methodDetails = pathData[method.toLowerCase()];

      const {
        parameters = [],
        responses = {},
        security = [],
        requestBody = {},
        operationId = '',
      } = methodDetails;

      // Thank you, D.Pro 🚀
      // TODO: inject code snippets from yoyodyne/holodeck/??? as well so that they
      // can be picked up by code-hike or other subsequent plugins
      const apiSpec: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'ApiSpec',
        children: [],
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'path',
            value: path,
          },
          {
            type: 'mdxJsxAttribute',
            name: 'method',
            value: method,
          },
          {
            type: 'mdxJsxAttribute',
            name: 'parameters',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: valueToEstree(parameters),
                    },
                  ],
                  sourceType: 'module',
                },
              },
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'responses',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: valueToEstree(responses),
                    },
                  ],
                  sourceType: 'module',
                },
              },
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'security',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: valueToEstree(security),
                    },
                  ],
                  sourceType: 'module',
                },
              },
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'requestBody',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: valueToEstree(requestBody),
                    },
                  ],
                  sourceType: 'module',
                },
              },
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'operationId',
            value: operationId,
          },
          {
            type: 'mdxJsxAttribute',
            name: 'servers',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: valueToEstree(servers),
                    },
                  ],
                  sourceType: 'module',
                },
              },
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'description',
            value: description,
          },
        ],
      };

      // Replace the original node with the extracted data
      parent.children[index] = apiSpec;
    });
  };
}
