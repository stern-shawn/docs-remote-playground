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

const languages = [
  'JavaScript',
  'Python',
  'C#',
  'Java',
  'Go',
  'Php',
  'Ruby',
  'twilio-cli',
  'curl',
] as const;

const extensions = [
  'js',
  'py',
  'cs',
  'java',
  'go',
  'php',
  'rb',
  'shell',
] as const;

const langToMdExtMap: Record<
  (typeof languages)[number],
  (typeof extensions)[number]
> = {
  JavaScript: 'js',
  Python: 'py',
  'C#': 'cs',
  Java: 'java',
  Go: 'go',
  Php: 'php',
  Ruby: 'rb',
  'twilio-cli': 'shell',
  curl: 'shell',
} as const;

// Normally these samples would come from a source like yoyodyne? tbd
const samples: Record<string, string> = {
  JavaScript: `
  // Download the helper library from https://www.twilio.com/docs/node/install
  // Find your Account SID and Auth Token at twilio.com/console
  // and set the environment variables. See http://twil.io/secure
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
  
  client.messages
    .create({ body: 'Hi there', from: '+15017122661', to: '+15558675310' })
    .then((message) => console.log(message.sid));
  `,
  Python: `
  py send.py
  # Download the helper library from https://www.twilio.com/docs/python/install
  import os
  from twilio.rest import Client
  
  # Find your Account SID and Auth Token at twilio.com/console
  # and set the environment variables. See http://twil.io/secure
  account_sid = os.environ['TWILIO_ACCOUNT_SID']
  auth_token = os.environ['TWILIO_AUTH_TOKEN']
  client = Client(account_sid, auth_token)
  
  message = client.messages.create(
                                body='Hi there',
                                from_='+15017122661',
                                to='+15558675310'
                            )
  
  print(message.sid)
  `,
  'C#': `
  // Install the C# / .NET helper library from twilio.com/docs/csharp/install
  using System;
  using Twilio;
  using Twilio.Rest.Api.V2010.Account;
  
  class Program
  {
      static void Main(string[] args)
      {
          // Find your Account SID and Auth Token at twilio.com/console
          // and set the environment variables. See http://twil.io/secure
          string accountSid = Environment.GetEnvironmentVariable("TWILIO_ACCOUNT_SID");
          string authToken = Environment.GetEnvironmentVariable("TWILIO_AUTH_TOKEN");
  
          TwilioClient.Init(accountSid, authToken);
  
          var message = MessageResource.Create(
              body: "Hi there",
              from: new Twilio.Types.PhoneNumber("+15017122661"),
              to: new Twilio.Types.PhoneNumber("+15558675310")
          );
  
          Console.WriteLine(message.Sid);
      }
  }
  `,
  Java: `
  // Install the Java helper library from twilio.com/docs/java/install
  
  import com.twilio.Twilio;
  import com.twilio.rest.api.v2010.account.Message;
  import com.twilio.type.PhoneNumber;
  
  public class Example {
      // Find your Account SID and Auth Token at twilio.com/console
      // and set the environment variables. See http://twil.io/secure
      public static final String ACCOUNT_SID = System.getenv("TWILIO_ACCOUNT_SID");
      public static final String AUTH_TOKEN = System.getenv("TWILIO_AUTH_TOKEN");
  
      public static void main(String[] args) {
          Twilio.init(ACCOUNT_SID, AUTH_TOKEN);
          Message message = Message.creator(
                  new com.twilio.type.PhoneNumber("+15558675310"),
                  new com.twilio.type.PhoneNumber("+15017122661"),
                  "Hi there")
              .create();
  
          System.out.println(message.getSid());
      }
  }
  `,
  Go: `
  // Download the helper library from https://www.twilio.com/docs/go/install
  package main
  
  import (
    "fmt"
    "github.com/twilio/twilio-go"
    api "github.com/twilio/twilio-go/rest/api/v2010"
  )
  
  func main() {
    // Find your Account SID and Auth Token at twilio.com/console
    // and set the environment variables. See http://twil.io/secure
    client := twilio.NewRestClient()
  
    params := &api.CreateMessageParams{}
    params.SetBody("Hi there")
    params.SetFrom("+15017122661")
    params.SetTo("+15558675310")
  
    resp, err := client.Api.CreateMessage(params)
    if err != nil {
      fmt.Println(err.Error())
    } else {
      if resp.Sid != nil {
        fmt.Println(*resp.Sid)
      } else {
        fmt.Println(resp.Sid)
      }
    }
  }
  `,
  Php: `
  <?php
  
  // Update the path below to your autoload.php,
  // see https://getcomposer.org/doc/01-basic-usage.md
  require_once '/path/to/vendor/autoload.php';
  
  use Twilio\Rest\Client;
  
  // Find your Account SID and Auth Token at twilio.com/console
  // and set the environment variables. See http://twil.io/secure
  $sid = getenv("TWILIO_ACCOUNT_SID");
  $token = getenv("TWILIO_AUTH_TOKEN");
  $twilio = new Client($sid, $token);
  
  $message = $twilio->messages
                    ->create("+15558675310", // to
                             ["body" => "Hi there", "from" => "+15017122661"]
                    );
  
  print($message->sid);
  `,
  Ruby: `
  # Download the helper library from https://www.twilio.com/docs/ruby/install
  require 'rubygems'
  require 'twilio-ruby'
  
  # Find your Account SID and Auth Token at twilio.com/console
  # and set the environment variables. See http://twil.io/secure
  account_sid = ENV['TWILIO_ACCOUNT_SID']
  auth_token = ENV['TWILIO_AUTH_TOKEN']
  @client = Twilio::REST::Client.new(account_sid, auth_token)
  
  message = @client.messages.create(
                               body: 'Hi there',
                               from: '+15017122661',
                               to: '+15558675310'
                             )
  
  puts message.sid
  `,
  'twilio-cli': `
  # Install the twilio-cli from https://twil.io/cli
  
  twilio api:core:messages:create \
      --body "Hi there" \
      --from +15017122661 \
      --to +15558675310
  `,
  curl: `
  curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  --data-urlencode "Body=Hi there" \
  --data-urlencode "From=+15017122661" \
  --data-urlencode "To=+15558675310" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
  `,
};

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

      // TODO
      // const samples = some operation to fetch samples 🙃

      // <CH.Code> accepts a rows prop to determine vertical space for rendering samples
      const maxSampleLines = languages.reduce((currMax, lang) => {
        // Determine the number of lines in this sample
        const lines = (samples[lang].match(/\n/g) || '').length + 1;
        if (lines > currMax) return lines;
        return currMax;
      }, 1);

      // Inject a code-hike Code element (<CH.Code>) with nested samples in each language
      const codeSamples: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'CH.Code',
        children: languages.map((lang) => {
          const ext = langToMdExtMap[lang];

          return {
            type: 'code',
            meta: lang,
            lang: ext,
            value: samples[lang],
          };
        }),
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'rows',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: '', //! not sure why TS complains if this isn't defined, it isn't necessary in the apiSpec block
              data: {
                estree: {
                  type: 'Program',
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: valueToEstree(maxSampleLines),
                    },
                  ],
                  sourceType: 'module',
                },
              },
            },
          },
        ],
      };

      parent.children.splice(index, 1, ...[apiSpec, codeSamples]);
    });
  };
}
