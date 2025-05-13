export function fileUpload(...types: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = types.join(',');
    input.multiple = false;
    input.style.display = 'none';

    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          resolve(content);
          document.body.removeChild(input);
        };
        reader.onerror = () => {
          reject(reader.error);
          document.body.removeChild(input);
        };
        reader.readAsText(file);
      } else {
        document.body.removeChild(input);
        reject(new Error('No file selected'));
      }
    };

    input.click();
  });
}