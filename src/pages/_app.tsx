import '@code-hike/mdx/dist/index.css';
import { Theme } from '@twilio-paste/core/theme';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Theme.Provider theme="Twilio">
      <Component {...pageProps} />{' '}
    </Theme.Provider>
  );
}
