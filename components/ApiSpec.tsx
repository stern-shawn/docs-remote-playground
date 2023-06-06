import { Box } from '@twilio-paste/box';
import { Heading } from '@twilio-paste/heading';
import { Paragraph } from '@twilio-paste/paragraph';
import { TBody, Table, Td, Tr } from '@twilio-paste/table';

export const ApiSpec = ({
  path,
  method,
  description,
  parameters,
  responses,
  security,
  requestBody,
  operationId,
}: {
  path?: string;
  method?: string;
  description?: string;
  parameters: {
    name: string;
    in: string;
    description: string;
    schema: { type: string; [key: string]: any };
    required?: boolean;
  }[];
  responses: {
    [key: number]: any;
  };
  security: {
    accountSid_authToken: [];
  }[];
  requestBody?: {
    [key: string]: {};
  };
  operationId?: string;
}) => {
  return (
    <div>
      <Heading as="h3" variant="heading30">
        {method?.toUpperCase()} {path} aka {operationId}
      </Heading>
      <Paragraph>{description}</Paragraph>

      {parameters.length > 0 && (
        <>
          <Heading as="h4" variant="heading40">
            Parameters:
          </Heading>
          <Box marginBottom="space60">
            <Table scrollHorizontally tableLayout="fixed">
              {/* https://github.com/vercel/next.js/discussions/36754 */}
              <TBody>
                {parameters.map((p) => {
                  return (
                    <Tr key={p.name}>
                      <Td>
                        {p.name}
                        {p.required && '*'}
                      </Td>
                      <Td>{p.in}</Td>
                      <Td>{p.schema.type}</Td>
                      <Td>{p.description}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </Box>
        </>
      )}

      {responses != null && Object.keys(responses).length > 0 && (
        <>
          <Heading as="h4" variant="heading40">
            Responses:
          </Heading>
          <Box marginBottom="space60">
            <Table scrollHorizontally tableLayout="fixed">
              <TBody>
                {Object.entries(responses).map(([statusCode, response]) => {
                  return (
                    <Tr key={statusCode}>
                      <Td>{statusCode}</Td>
                      {/* <td>
                    {Object.entries(
                      response?.content?.['application/json']?.schema
                        ?.properties?.meta?.properties
                    ).reduce((acc, [key, value]) => {
                      acc += `${key}: ${value},`;
                      return acc;
                    }, '')}
                  </td> */}
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </Box>
        </>
      )}

      <details>
        <summary>Stringified OpenAPI data:</summary>
        <pre>
          {JSON.stringify(
            {
              path,
              method,
              description,
              parameters,
              responses,
              security,
              requestBody,
              operationId,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
};
