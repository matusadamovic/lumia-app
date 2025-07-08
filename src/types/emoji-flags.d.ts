declare module 'emoji-flags' {
  interface Country {
    code: string;
    emoji: string;
    unicode: string;
    name: string;
    title: string;
    dialCode: string;
  }

  const flags: {
    countryCode(code: string): Country | undefined;
    data: Country[];
  };
  export default flags;
}
