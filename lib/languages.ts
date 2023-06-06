export const languages = [
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

export const extensions = [
  'js',
  'py',
  'cs',
  'java',
  'go',
  'php',
  'rb',
  'shell',
] as const;

export const langToMdExtMap: Record<
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
