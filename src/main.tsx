import { render } from "solid-js/web";
import { createThemePrimitive, ColorScheme } from "solid-compose";
import App from "./App";
import "./globals.css";
import { initI18n } from "./i18n/i18n";

window.onerror = (_msg, _src, _line, _col, err) => {
  document.body.innerHTML = `<pre style="color:red;padding:20px;white-space:pre-wrap">${err?.stack ?? _msg}</pre>`;
  return true;
};

try {
  initI18n();

  createThemePrimitive({
    themes: [
      { name: "light", colorScheme: ColorScheme.Light, default: true },
      { name: "dark", colorScheme: ColorScheme.Dark, default: true },
      { name: "high_contrast", colorScheme: ColorScheme.Dark },
    ],
  });

  render(
    () => <App />,
    document.getElementById("root") as HTMLElement
  );
} catch (e: any) {
  document.body.innerHTML = `<pre style="color:red;padding:20px;white-space:pre-wrap">${e?.stack ?? e}</pre>`;
}
