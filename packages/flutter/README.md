# @json-render/flutter

Flutter exporter for `@json-render/core`. Generate Dart widget files and minimal Flutter app scaffolds from json-render specs.

## Install

```bash
npm install @json-render/core @json-render/flutter
```

## Quick Start

### Generate a Dart widget file

```typescript
import { generateFlutterWidgetFile } from "@json-render/flutter";
import type { Spec } from "@json-render/core";

const spec: Spec = {
  root: "screen",
  state: {
    form: { email: "ada@example.com" },
  },
  elements: {
    screen: {
      type: "SafeArea",
      props: {},
      children: ["content"],
    },
    content: {
      type: "Column",
      props: { gap: 16 },
      children: ["title", "email", "submit"],
    },
    title: {
      type: "Heading",
      props: { text: "Contact", level: 2 },
    },
    email: {
      type: "TextInput",
      props: {
        label: "Email",
        value: { $bindState: "/form/email" },
      },
    },
    submit: {
      type: "Button",
      props: { label: "Save" },
      on: {
        press: {
          action: "saveProfile",
          params: {
            email: { $state: "/form/email" },
          },
        },
      },
    },
  },
};

const file = generateFlutterWidgetFile(spec, {
  className: "ContactScreen",
});
```

### Generate a minimal Flutter app scaffold

```typescript
import { generateFlutterProject } from "@json-render/flutter";

const files = generateFlutterProject(spec, {
  className: "ContactScreen",
  packageName: "contact_screen_demo",
  appTitle: "Contact Screen Demo",
});
```

## Supported Semantics

- `state` initialization
- `visible` conditions including `$and` and `$or`
- `repeat` lists
- prop resolution for `$state`, `$item`, `$index`, `$bindState`, `$bindItem`, `$cond`, and `$template`
- action bindings with built-in `setState` handling plus a host `onAction` callback

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

Unknown component types are rendered as visible fallback boxes instead of being dropped silently.

## Exports

```typescript
interface GeneratedFile {
  path: string;
  content: string;
}

interface FlutterExportOptions {
  className?: string;
  widgetFilePath?: string;
  appTitle?: string;
  packageName?: string;
}

function generateFlutterWidgetFile(
  spec: Spec,
  options?: FlutterExportOptions
): GeneratedFile

function generateFlutterProject(
  spec: Spec,
  options?: FlutterExportOptions
): GeneratedFile[]
```

## License

Apache-2.0
