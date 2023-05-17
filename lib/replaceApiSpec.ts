import { readFileSync } from 'fs';
import * as nodePath from 'path';
import { visit } from 'unist-util-visit';

interface OpenApiSpec {
  paths: {
    [path: string]: {
      [method: string]: {
        description?: string;
        parameters?: {
          name: string;
          in: string;
          description?: string;
          schema: { type: string; format?: string };
          required?: boolean;
          [key: string]: any;
        }[];
        responses?: {
          [code: string]: {
            description?: string;
            content?: {
              [contentType: string]: {
                schema: { $ref?: string; type?: string };
                [key: string]: any;
              };
            };
            [key: string]: any;
          };
        };
        security?: { [name: string]: any }[];
        requestBody?: {
          content: {
            [contentType: string]: {
              schema: { $ref?: string; type?: string };
              [key: string]: any;
            };
          };
          [key: string]: any;
        };
        [key: string]: any;
      };
    };
  };
}

interface ExtractedApiSpec {
  type: string;
  path: string;
  method: string;
  description?: string;
  parameters: {
    name: string;
    in: string;
    description?: string;
    schema: { type: string; format?: string };
    required?: boolean;
    [key: string]: any;
  }[];
  responses: {
    [code: string]: {
      description?: string;
      content?: {
        [contentType: string]: {
          schema: { $ref?: string; type?: string };
          [key: string]: any;
        };
      };
      [key: string]: any;
    };
  };
  security: { [name: string]: any }[];
  requestBody: {
    content: {
      [contentType: string]: {
        schema: { $ref?: string; type?: string };
        [key: string]: any;
      };
    };
    [key: string]: any;
  } | null;
}

export function replaceApiSpec() {
  return function doIt(tree: any) {
    console.log('Look at me, Im working!');
    console.log('tree', tree);
    visit(tree, 'paragraph', (node, index, parent) => {
      console.log('node: ', node);
      console.log('index: ', index);
      // console.log('parent: ', parent);
      if (!(node.children.length === 1 && node.children[0].type === 'text')) {
        console.log('early return node', node);
        return;
      }

      const codeNode = node.children[0];
      const codeContent = codeNode.value.trim();

      if (!codeContent.startsWith(':::automatic-api-spec')) {
        return;
      }

      console.log('Okay, actually processing something!', node);

      const specContent = codeContent
        .replace(':::automatic-api-spec', '')
        .trim();
      console.log('specContent: ', specContent);
      const specLines = specContent.split('\n');
      console.log('specLines: ', specLines);
      const [specName, path, method] = specLines[0].split(' ');
      console.log('specName: ', specName);
      console.log('path: ', path);
      console.log('method: ', method);

      const spec = JSON.parse(
        readFileSync(
          nodePath.resolve(process.cwd(), 'openapi', `${specName}.json`),
          'utf-8'
        )
      );
      console.log('spec: ', spec);

      const pathData = spec.paths[path];
      console.log('pathData: ', pathData);

      const { servers = [], description = '' } = pathData;
      console.log('servers: ', servers);
      console.log('description: ', description);
      const methodDetails = pathData[method.toLowerCase()];
      console.log('methodDetails: ', methodDetails);
      const {
        parameters = [],
        responses = {},
        security = [],
        requestBody = {},
        operationId = '',
      } = methodDetails;

      const apiSpec = {
        type: 'apiSpec',
        path,
        method,
        description,
        parameters,
        responses,
        security,
        requestBody,
        operationId,
      };

      // Replace the original node with the extracted data
      parent.children.splice(index, 1, apiSpec);
    });
  };
}