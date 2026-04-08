export function normalizeTauriViteEnvResponse(body) {
  if (!body.includes("const defines =")) {
    return body;
  }

  let next = body;

  // Tauri can inject quoted-string define keys, and Vite's env serializer
  // emits them as invalid object keys: {""random-key"": ''}.
  next = next.replace(/""([^"]+)""(?=\s*:)/g, '"$1"');

  // Tauri dev may additionally mutate the random invoke-key define token in
  // transit to the webview. Avoid embedding that key as a literal in the
  // object source by rewriting it to a runtime computed property.
  next = next.replace(
    /const defines = \{"([^"]+)": ''\s*,\s*"global": globalThis\};/,
    (_, invokeKey) => {
      const charCodes = Array.from(invokeKey)
        .map((char) => char.charCodeAt(0))
        .join(",");
      return [
        'const defines = {"global": globalThis};',
        `defines[String.fromCharCode(${charCodes})] = '';`,
      ].join("\n");
    },
  );

  return next;
}
