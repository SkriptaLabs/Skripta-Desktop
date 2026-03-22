import { render } from "solid-js/web";
import { createLocalePrimitive, createThemePrimitive, ColorScheme } from "solid-compose";
import App from "./App";
import "./globals.css";

createLocalePrimitive({ supportedLanguageTags: ["de"] });

createThemePrimitive({
  themes: [
    { name: "light", colorScheme: ColorScheme.Light, default: true },
    { name: "dark", colorScheme: ColorScheme.Dark, default: true },
    { name: "high_contrast", colorScheme: ColorScheme.Dark },  ],
});

render(
  () => (
      <App />
  ),
  document.getElementById("root") as HTMLElement
);
