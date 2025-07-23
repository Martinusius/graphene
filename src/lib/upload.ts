export function fileUpload(...types: string[]): Promise<string | Uint8Array> {
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
        // Detect if the file type is text or binary
        const isText = file.type.startsWith('text/') || file.type === 'application/json' || types.some(t => t.startsWith('text/') || t === 'application/json');
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            resolve(reader.result as string);
          }
          document.body.removeChild(input);
        };
        reader.onerror = () => {
          reject(reader.error);
          document.body.removeChild(input);
        };
        if (isText) {
          reader.readAsText(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      } else {
        document.body.removeChild(input);
        reject(new Error('No file selected'));
      }
    };

    input.click();
  });
}