import { render } from "solid-js/web";
import App from "./App";
import "./globals.css";
import { ThemeProvider } from "./themes/theme.context";

render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root") as HTMLElement
);
