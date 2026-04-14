declare const chrome:
  | {
      tabs?: {
        create(details: { url: string }): void;
      };
    }
  | undefined;

document.getElementById('open-photos')?.addEventListener('click', () => {
  chrome?.tabs?.create({ url: 'https://photos.google.com/' });
});
