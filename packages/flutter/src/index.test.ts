import { describe, expect, it } from "vitest";
import type { Spec } from "@json-render/core";
import { generateFlutterProject, generateFlutterWidgetFile } from "./index";

const spec: Spec = {
  root: "screen",
  state: {
    form: {
      email: "user@example.com",
    },
    todos: [
      { label: "First", done: true },
      { label: "Second", done: false },
    ],
  },
  elements: {
    screen: {
      type: "SafeArea",
      props: {},
      children: ["content"],
    },
    content: {
      type: "Column",
      props: { gap: 12 },
      children: ["title", "email", "list"],
    },
    title: {
      type: "Heading",
      props: { text: "Generated Screen", level: 2 },
    },
    email: {
      type: "TextInput",
      props: {
        label: "Email",
        value: { $bindState: "/form/email" },
      },
    },
    list: {
      type: "Row",
      props: { gap: 8 },
      repeat: { statePath: "/todos" },
      children: ["todo-label"],
    },
    "todo-label": {
      type: "Text",
      props: { text: { $item: "label" } },
      visible: { $item: "done", eq: true },
    },
  },
};

describe("generateFlutterWidgetFile", () => {
  it("generates a self-contained Dart widget file", () => {
    const file = generateFlutterWidgetFile(spec, {
      className: "DemoScreen",
    });

    expect(file.path).toBe("lib/generated_json_render.dart");
    expect(file.content).toContain("class DemoScreen extends StatefulWidget");
    expect(file.content).toContain("typedef JsonRenderActionHandler");
    expect(file.content).toContain("const String _generatedSpecJson = r'''");
    expect(file.content).toContain("TextFormField(");
    expect(file.content).toContain("SwitchListTile(");
    expect(file.content).toContain("RegExp(r'\\\\$\\\\{([^}]+)\\\\}')");
    expect(file.content).toContain('"type": "Heading"');
    expect(file.content).toContain('"$bindState": "/form/email"');
    expect(file.content).toContain('"statePath": "/todos"');
  });

  it("supports custom output paths", () => {
    const file = generateFlutterWidgetFile(spec, {
      widgetFilePath: "lib/generated/demo.dart",
    });

    expect(file.path).toBe("lib/generated/demo.dart");
  });
});

describe("generateFlutterProject", () => {
  it("generates a minimal Flutter project scaffold", () => {
    const files = generateFlutterProject(spec, {
      className: "DemoScreen",
      widgetFilePath: "lib/generated/demo.dart",
      packageName: "demo_app",
      appTitle: "Demo App",
    });

    expect(files).toHaveLength(3);
    expect(files[0]).toEqual(
      expect.objectContaining({
        path: "pubspec.yaml",
      }),
    );
    expect(files[1]).toEqual(
      expect.objectContaining({
        path: "lib/main.dart",
      }),
    );
    expect(files[2]).toEqual(
      expect.objectContaining({
        path: "lib/generated/demo.dart",
      }),
    );
    expect(files[1]?.content).toContain("import 'generated/demo.dart';");
    expect(files[1]?.content).toContain("child: DemoScreen()");
  });
});
