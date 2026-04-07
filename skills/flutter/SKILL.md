---
name: flutter
description: Flutter exporter for json-render that turns specs into Dart widget files and minimal Flutter app scaffolds. Use when working with @json-render/flutter, exporting JSON specs to Flutter, or generating sample Flutter pages from json-render specs.
---

# @json-render/flutter

Flutter exporter that converts json-render specs into Dart widget files and app scaffolds.

## Quick Start

```typescript
import {
  generateFlutterWidgetFile,
  generateFlutterProject,
} from "@json-render/flutter";
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "screen",
  elements: {
    screen: {
      type: "SafeArea",
      props: {},
      children: ["content"],
    },
    content: {
      type: "Column",
      props: { gap: 16 },
      children: ["title", "submit"],
    },
    title: {
      type: "Heading",
      props: { text: "Hello Flutter", level: 2 },
    },
    submit: {
      type: "Button",
      props: { label: "Continue" },
    },
  },
};

const widgetFile = generateFlutterWidgetFile(spec, {
  className: "GeneratedScreen",
});

const projectFiles = generateFlutterProject(spec, {
  className: "GeneratedScreen",
  packageName: "generated_screen_demo",
  appTitle: "Generated Screen Demo",
});
```

## What It Preserves

- `state` initialization
- `visible` conditions
- `repeat` lists
- dynamic props: `$state`, `$item`, `$index`, `$bindState`, `$bindItem`, `$cond`, `$template`
- action callbacks with built-in `setState`

## Supported Components

- `SafeArea`
- `ScrollContainer`
- `Row`
- `Column`
- `Container`
- `Card`
- `Heading`
- `Paragraph`
- `Label`
- `Text`
- `Button`
- `Pressable`
- `Image`
- `Avatar`
- `Divider`
- `Spacer`
- `Badge`
- `Chip`
- `TextInput`
- `SearchBar`
- `Switch`
- `Checkbox`
- `Slider`

Unknown component types fall back to a visible placeholder widget.

## Key Exports

| Export | Purpose |
|--------|---------|
| `generateFlutterWidgetFile` | Generate a single Dart widget file |
| `generateFlutterProject` | Generate `pubspec.yaml`, `lib/main.dart`, and widget file |
| `FlutterExportOptions` | Configure class name, output path, app title, and package name |
| `GeneratedFile` | Simple `{ path, content }` result type |
