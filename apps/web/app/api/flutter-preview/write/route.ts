import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { NextResponse } from "next/server";
import type { Spec } from "@json-render/core";
import {
  type FlutterExportOptions,
  generateFlutterProject,
} from "@json-render/flutter";

export const runtime = "nodejs";

type WriteRequestBody = {
  spec?: unknown;
  exportOptions?: Partial<FlutterExportOptions>;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSpec(value: unknown): value is Spec {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value.root === "string" &&
    isObjectRecord(value.elements) &&
    (value.state === undefined || isObjectRecord(value.state))
  );
}

function sanitizeExportOptions(
  value: unknown,
): Partial<FlutterExportOptions> | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const options: Partial<FlutterExportOptions> = {};

  if (typeof value.className === "string" && value.className.trim()) {
    options.className = value.className.trim();
  }

  if (typeof value.widgetFilePath === "string" && value.widgetFilePath.trim()) {
    options.widgetFilePath = value.widgetFilePath.trim();
  }

  if (typeof value.appTitle === "string" && value.appTitle.trim()) {
    options.appTitle = value.appTitle.trim();
  }

  if (typeof value.packageName === "string" && value.packageName.trim()) {
    options.packageName = value.packageName.trim();
  }

  return options;
}

function normalizeRelativePath(filePath: string) {
  const normalized = filePath.replaceAll("\\", "/").trim();

  if (!normalized || normalized.startsWith("/")) {
    return null;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return segments.join("/");
}

function ensureInsideRoot(root: string, candidate: string) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

const EXAMPLES_FLUTTER_ROOT = resolve(
  fileURLToPath(new URL("../../../../../../examples/flutter", import.meta.url)),
);

export async function POST(req: Request) {
  let body: WriteRequestBody;

  try {
    body = (await req.json()) as WriteRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isSpec(body.spec)) {
    return NextResponse.json(
      { error: "Body must include a valid json-render spec" },
      { status: 400 },
    );
  }

  const exportOptions = sanitizeExportOptions(body.exportOptions);
  const generatedFiles = generateFlutterProject(body.spec, exportOptions);
  const filesToWrite = [
    {
      path: "spec.json",
      content: `${JSON.stringify(body.spec, null, 2)}\n`,
    },
    ...generatedFiles,
  ];

  try {
    for (const file of filesToWrite) {
      const relativePath = normalizeRelativePath(file.path);
      if (!relativePath) {
        return NextResponse.json(
          { error: `Refusing to write invalid path: ${file.path}` },
          { status: 400 },
        );
      }

      const absolutePath = resolve(EXAMPLES_FLUTTER_ROOT, relativePath);
      if (!ensureInsideRoot(EXAMPLES_FLUTTER_ROOT, absolutePath)) {
        return NextResponse.json(
          { error: `Refusing to write outside examples/flutter: ${file.path}` },
          { status: 400 },
        );
      }

      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, file.content, "utf-8");
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to write generated Flutter files",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    targetRoot: "examples/flutter",
    writtenFiles: filesToWrite.map((file) => file.path),
  });
}
