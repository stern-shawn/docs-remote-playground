import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://assets.twilio.com" />
        <link
          rel="stylesheet"
          href="https://assets.twilio.com/public_assets/paste-fonts/1.5.0/fonts.css"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
