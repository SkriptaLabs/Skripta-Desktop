import type { Component } from "solid-js";

export interface MenuItem {
  id: string;
  label: string;
  component: Component;
}
